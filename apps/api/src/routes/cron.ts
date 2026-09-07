import { timingSafeEqual } from "node:crypto";
import { POINTS_EQUB_COMPLETE, POINTS_EQUB_WIN } from "@fitequb/shared";
import { Hono } from "hono";
import { notifySettlementResult } from "../lib/bot-notify.js";
import { getBanks, initiateTransfer } from "../lib/chapa.js";
import type { ChapaTransferResponse } from "../lib/chapa.js";
import { processPilotPayouts } from "../lib/pilot-payouts.js";
import { supabase } from "../lib/supabase.js";

const cron = new Hono();

interface PayoutJobRow {
	id: string;
	ledger_id: string;
	user_id: string;
	amount: number;
	reference: string;
	provider_reference: string | null;
	attempts: number;
	status: string;
	users?: unknown;
}

interface PayoutUser {
	full_name: string | null;
	phone: string | null;
}

interface SettlementResult {
	status?: string;
	[key: string]: unknown;
}

let equbLedgerHasPaidAtColumn: Promise<boolean> | null = null;

// Verify cron secret to prevent unauthorized access (timing-safe)
function verifyCronSecret(secret: string | undefined): boolean {
	const expected = process.env.CRON_SECRET;
	if (!expected || !secret) return false;
	const a = Buffer.from(expected);
	const b = Buffer.from(secret);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

function getPayoutUser(users: unknown): PayoutUser | null {
	if (!users) return null;
	if (Array.isArray(users)) {
		return (users[0] as PayoutUser | undefined) ?? null;
	}
	return users as PayoutUser;
}

function getSettlementStatus(data: unknown): string | null {
	if (!data || typeof data !== "object") return null;
	return (data as SettlementResult).status ?? null;
}

async function enqueuePayoutJobs(roomId?: string) {
	let query = supabase
		.from("equb_ledger")
		.select("id, room_id, user_id, amount")
		.in("type", ["payout", "refund"])
		.not("user_id", "is", null)
		.gt("amount", 0);

	const hasPaidAtColumn = await hasLegacyPaidAtColumn();
	if (hasPaidAtColumn) {
		query = query.is("paid_at", null);
	}

	if (roomId) {
		query = query.eq("room_id", roomId);
	}

	const { data: payouts, error } = await query;
	if (error || !payouts || payouts.length === 0) {
		return { enqueued: 0, error: error?.message ?? null };
	}

	const jobs = payouts.map((payout) => ({
		ledger_id: payout.id,
		user_id: payout.user_id,
		amount: payout.amount,
		reference: `payout-${payout.id}`,
		status: "pending",
	}));

	const { error: upsertError } = await supabase
		.from("payout_jobs")
		.upsert(jobs, { onConflict: "ledger_id", ignoreDuplicates: true });

	return {
		enqueued: upsertError ? 0 : jobs.length,
		error: upsertError?.message ?? null,
	};
}

async function hasLegacyPaidAtColumn() {
	equbLedgerHasPaidAtColumn ??= probeEqubLedgerPaidAtColumn();
	return equbLedgerHasPaidAtColumn;
}

async function probeEqubLedgerPaidAtColumn() {
	const { error } = await supabase.from("equb_ledger").select("paid_at").limit(1);
	if (!error) return true;

	const message = error.message.toLowerCase();
	if (
		error.code === "PGRST204" ||
		error.code === "42703" ||
		(message.includes("paid_at") &&
			(message.includes("column") || message.includes("schema cache")))
	) {
		return false;
	}

	throw new Error(error.message);
}

// POST /cron/settle — settle expired Equbs
cron.post("/settle", async (c) => {
	const secret = c.req.header("x-cron-secret");
	if (!verifyCronSecret(secret)) {
		return c.json({ data: null, error: "Unauthorized" }, 401);
	}

	const { error: lifecycleError } = await supabase.rpc("pilot_lifecycle");
	if (lifecycleError) return c.json({ data: null, error: lifecycleError.message }, 500);
	// Find active rooms past their end_date
	const { data: expiredRooms, error: fetchError } = await supabase
		.from("equb_rooms")
		.select("id, name")
		.eq("status", "active")
		.lte("end_date", new Date().toISOString());

	if (fetchError) {
		return c.json({ data: null, error: fetchError.message }, 500);
	}

	if (!expiredRooms || expiredRooms.length === 0) {
		return c.json({ data: { settled: 0, rooms: [] }, error: null });
	}

	const results = [];

	for (const room of expiredRooms) {
		const { data, error } = await supabase.rpc("settle_equb", {
			p_room_id: room.id,
		});
		const settlementStatus = getSettlementStatus(data);

		if (!error && settlementStatus === "settled") {
			// Award points to qualified members
			const { data: members } = await supabase
				.from("equb_members")
				.select("user_id, qualified")
				.eq("room_id", room.id);

			for (const m of members ?? []) {
				if (m.qualified) {
					await supabase.rpc("award_points", {
						p_user_id: m.user_id,
						p_points: POINTS_EQUB_COMPLETE,
						p_reason: `Completed Equb: ${room.name}`,
						p_source_type: "equb_complete",
					});
				}
			}

			// Award win bonus to payout recipients
			const { data: payouts } = await supabase
				.from("equb_ledger")
				.select("user_id")
				.eq("room_id", room.id)
				.eq("type", "payout");

			await enqueuePayoutJobs(room.id);

			for (const p of payouts ?? []) {
				await supabase.rpc("award_points", {
					p_user_id: p.user_id,
					p_points: POINTS_EQUB_WIN,
					p_reason: `Won Equb payout: ${room.name}`,
					p_source_type: "equb_win",
				});
			}

			// Process trainer commissions from house fee
			await supabase.rpc("process_trainer_commissions", {
				p_room_id: room.id,
			});

			// Send Telegram notifications to all members about settlement results
			const { data: allMembers } = await supabase
				.from("equb_members")
				.select("user_id, qualified, payout_amount")
				.eq("room_id", room.id);

			for (const m of allMembers ?? []) {
				notifySettlementResult(
					m.user_id,
					room.name,
					room.id,
					m.qualified ?? false,
					m.payout_amount ?? 0,
				).catch(() => {});
			}
		}

		results.push({
			room_id: room.id,
			name: room.name,
			success: !error && settlementStatus === "settled",
			result: error ? error.message : data,
		});
	}

	return c.json({
		data: { settled: results.filter((r) => r.success).length, rooms: results },
		error: null,
	});
});

// POST /cron/reminders — send workout reminders
cron.post("/reminders", async (c) => {
	const secret = c.req.header("x-cron-secret");
	if (!verifyCronSecret(secret)) {
		return c.json({ data: null, error: "Unauthorized" }, 401);
	}

	const today = new Date().toISOString().split("T")[0];

	// Get active rooms with members who haven't logged today
	const { data: activeRooms } = await supabase
		.from("equb_rooms")
		.select("id, name")
		.eq("status", "active");

	if (!activeRooms || activeRooms.length === 0) {
		return c.json({ data: { reminded: 0 }, error: null });
	}

	let reminded = 0;

	for (const room of activeRooms) {
		// Get members of this room with their telegram IDs
		const { data: members } = await supabase
			.from("equb_members")
			.select("user_id, users(telegram_id, full_name)")
			.eq("room_id", room.id);

		if (!members) continue;

		// Get users who already logged today
		const { data: todayWorkouts } = await supabase
			.from("workouts")
			.select("user_id")
			.eq("room_id", room.id)
			.gte("logged_at", `${today}T00:00:00Z`)
			.lt("logged_at", `${today}T23:59:59Z`);

		const loggedUserIds = new Set(todayWorkouts?.map((w) => w.user_id) ?? []);

		// Filter members who haven't logged
		const needsReminder = members.filter((m) => !loggedUserIds.has(m.user_id));

		for (const member of needsReminder) {
			const user = member.users as unknown as {
				telegram_id: number;
				full_name: string;
			} | null;
			if (!user?.telegram_id) continue;

			// Send Telegram notification via bot API
			const botToken = process.env.TELEGRAM_BOT_TOKEN;
			if (!botToken) continue;

			const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL ?? "";
			const message = `🏋️ Hey ${user.full_name}! You haven't logged your workout for "${room.name}" today.\n\nDon't miss out — log now to stay on track!`;

			await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chat_id: user.telegram_id,
					text: message,
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "Log Workout",
									web_app: { url: `${miniAppUrl}/equbs/${room.id}/log` },
								},
							],
						],
					},
				}),
			});

			reminded++;
		}
	}

	return c.json({ data: { reminded }, error: null });
});

// POST /cron/payouts — process payouts for settled Equbs
cron.post("/payouts", async (c) => {
	const secret = c.req.header("x-cron-secret");
	if (!verifyCronSecret(secret)) {
		return c.json({ data: null, error: "Unauthorized" }, 401);
	}

	const { error: lifecycleError } = await supabase.rpc("pilot_lifecycle");
	if (lifecycleError) return c.json({ data: null, error: lifecycleError.message }, 500);
	const pilotResult = await processPilotPayouts();
	const enqueueResult = await enqueuePayoutJobs();

	const { data: pendingJobs, error: fetchError } = await supabase
		.from("payout_jobs")
		.select(
			"id, ledger_id, user_id, amount, reference, provider_reference, attempts, status, users(full_name, phone)",
		)
		.in("status", ["pending", "failed"])
		.is("bank_code", null)
		.order("created_at", { ascending: true })
		.limit(50);

	if (fetchError) {
		return c.json({ data: null, error: fetchError.message }, 500);
	}

	if (!pendingJobs || pendingJobs.length === 0) {
		return c.json({
			data: { processed: 0, enqueued: enqueueResult.enqueued, payouts: [] },
			error: enqueueResult.error,
		});
	}

	const results = [];

	for (const job of pendingJobs as PayoutJobRow[]) {
		const { data: claimed } = await supabase
			.from("payout_jobs")
			.update({
				status: "processing",
				attempts: (job.attempts ?? 0) + 1,
				provider_reference: `${job.reference}-a${(job.attempts ?? 0) + 1}`,
				claimed_at: new Date().toISOString(),
				last_error: null,
			})
			.eq("id", job.id)
			.eq("attempts", job.attempts)
			.in("status", ["pending", "failed"])
			.select(
				"id, ledger_id, user_id, amount, reference, provider_reference, attempts, status, users(full_name, phone)",
			)
			.single<PayoutJobRow>();

		if (!claimed) {
			continue;
		}

		const user = getPayoutUser(claimed.users);

		if (!user?.phone) {
			await supabase
				.from("payout_jobs")
				.update({ status: "failed", last_error: "No phone number for payout" })
				.eq("id", claimed.id)
				.eq("attempts", claimed.attempts)
				.eq("status", "processing");
			results.push({
				payout_job_id: claimed.id,
				success: false,
				error: "No phone number for payout",
			});
			continue;
		}

		let transferResult: ChapaTransferResponse;
		try {
			transferResult = await initiateTransfer({
				account_name: user.full_name ?? "FitEqub Member",
				account_number: user.phone,
				amount: claimed.amount,
				currency: "ETB",
				reference: claimed.provider_reference ?? claimed.reference,
				bank_code:
					(await getBanks()).find((bank) => bank.name.toLowerCase().includes("telebirr"))?.id ??
					(() => {
						throw new Error("Telebirr payout bank unavailable");
					})(),
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Transfer request failed";
			await supabase
				.from("payout_jobs")
				.update({ status: "processing", last_error: message })
				.eq("id", claimed.id)
				.eq("attempts", claimed.attempts)
				.eq("status", "processing");
			results.push({
				payout_job_id: claimed.id,
				amount: claimed.amount,
				success: false,
				reference: claimed.reference,
				error: message,
			});
			continue;
		}

		const success = transferResult?.status === "success";

		if (success) {
			await supabase
				.from("payout_jobs")
				.update({
					status: "sent",
					sent_at: new Date().toISOString(),
					provider_response: transferResult,
				})
				.eq("id", claimed.id)
				.eq("attempts", claimed.attempts)
				.eq("status", "processing");
		} else {
			await supabase
				.from("payout_jobs")
				.update({
					status: "processing",
					last_error: transferResult?.message ?? "Transfer failed",
					provider_response: transferResult ?? null,
				})
				.eq("id", claimed.id)
				.eq("attempts", claimed.attempts)
				.eq("status", "processing");
		}

		results.push({
			payout_job_id: claimed.id,
			amount: claimed.amount,
			success,
			reference: claimed.reference,
		});
	}

	return c.json({
		data: {
			processed: results.filter((r) => r.success).length,
			pilot: pilotResult,
			enqueued: enqueueResult.enqueued,
			payouts: results,
		},
		error: enqueueResult.error,
	});
});

// POST /cron/daily-reset — process daily verification results and reset
cron.post("/daily-reset", async (c) => {
	const secret = c.req.header("x-cron-secret");
	if (!verifyCronSecret(secret)) {
		return c.json({ data: null, error: "Unauthorized" }, 401);
	}

	const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
	let updatedStreaks = 0;
	let completedDays = 0;
	let missedDays = 0;

	const { data: pilotRooms, error: pilotError } = await supabase
		.from("pilot_configs")
		.select("room_id");
	if (pilotError) return c.json({ data: null, error: "Pilot configuration unavailable" }, 503);
	const pilotIds = new Set((pilotRooms ?? []).map((p) => p.room_id));
	// Get all active equb members
	const { data: activeRooms } = await supabase
		.from("equb_rooms")
		.select("id")
		.eq("status", "active");

	if (activeRooms && activeRooms.length > 0) {
		const roomIds = activeRooms.map((r) => r.id);

		const { data: members } = await supabase
			.from("equb_members")
			.select("user_id, room_id, completed_days")
			.in("room_id", roomIds);

		if (members) {
			for (const member of members) {
				if (pilotIds.has(member.room_id)) continue;
				// Check if yesterday was complete
				const { data: summary } = await supabase
					.from("daily_verification_summary")
					.select("is_day_complete")
					.eq("user_id", member.user_id)
					.eq("date", yesterday)
					.single();

				if (summary?.is_day_complete) {
					// Increment completed_days
					await supabase
						.from("equb_members")
						.update({ completed_days: (member.completed_days ?? 0) + 1 })
						.eq("user_id", member.user_id)
						.eq("room_id", member.room_id);
					completedDays++;
				} else {
					missedDays++;
				}
			}
		}
	}

	// Update streak_days for ALL users
	const { data: allUsers } = await supabase.from("users").select("id, streak_days");
	if (allUsers) {
		for (const user of allUsers) {
			const { data: summary } = await supabase
				.from("daily_verification_summary")
				.select("is_day_complete")
				.eq("user_id", user.id)
				.eq("date", yesterday)
				.single();

			if (summary?.is_day_complete) {
				await supabase
					.from("users")
					.update({ streak_days: (user.streak_days ?? 0) + 1 })
					.eq("id", user.id);
				updatedStreaks++;
			} else if ((user.streak_days ?? 0) > 0) {
				// Reset streak
				await supabase.from("users").update({ streak_days: 0 }).eq("id", user.id);
			}
		}
	}

	// Clean up old verification data (> 30 days)
	const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
	await supabase.from("workout_verifications").delete().lt("verified_at", thirtyDaysAgo);
	await supabase.from("daily_verification_summary").delete().lt("date", thirtyDaysAgo.slice(0, 10));

	return c.json({
		data: {
			date: yesterday,
			completed_days: completedDays,
			missed_days: missedDays,
			streaks_updated: updatedStreaks,
		},
		error: null,
	});
});

export { cron };
