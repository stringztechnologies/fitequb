import { Hono } from "hono";
import { z } from "zod";
import { getBanks, initializePayment } from "../lib/chapa.js";
import { reconcilePilotReceipt } from "../lib/pilot-receipts.js";
import {
	getPilot,
	normalizePayoutJobs,
	pilotActor,
	pilotRpc,
	requirePilotStaff,
	uuid,
} from "../lib/pilot.js";
import { supabase } from "../lib/supabase.js";
import { rateLimit } from "../middleware/rate-limit.js";
import type { AppVariables } from "../types/context.js";

export const publicPilots = new Hono();
publicPilots.get("/:id", async (c) => {
	const room = uuid.parse(c.req.param("id"));
	const data = await getPilot(room);
	if (!data || (!data.published && !data.frozen_at))
		return c.json({ data: null, error: "Pilot not found" }, 404);
	const { data: coach, error } = await supabase
		.from("users")
		.select("full_name")
		.eq("id", data.coach_id)
		.single();
	if (error) throw new Error(error.message);
	return c.json({
		data: {
			...data,
			coach_name: coach.full_name,
			checkout_enabled:
				process.env.PILOT_CHECKOUT_ENABLED === "true" && data.checkout_ready && data.published,
		},
		error: null,
	});
});
export const pilots = new Hono<{ Variables: AppVariables }>();
pilots.use("*", rateLimit(60, 60_000));
pilots.get("/banks", async (c) => c.json({ data: await getBanks(), error: null }));
pilots.get("/:id", async (c) => {
	const room = uuid.parse(c.req.param("id"));
	const user = await pilotActor(c);
	const { data: pending, error: pendingError } = await supabase
		.from("payment_intents")
		.select("tx_ref")
		.eq("target_id", room)
		.eq("user_id", user)
		.eq("kind", "pilot_enrollment")
		.in("status", ["created", "paid"])
		.limit(1);
	if (pendingError) throw new Error(pendingError.message);
	for (const receipt of pending ?? []) {
		try {
			await reconcilePilotReceipt(receipt.tx_ref);
		} catch {
			/* Display pending; a redirect is never evidence of payment. */
		}
	}

	const responses = await Promise.all([
		supabase
			.from("pilot_enrollments")
			.select(
				"tx_ref,state,program_fee,stake_amount,terms_version,enrolled_at,payment_intents(status,checkout_status,checkout_url,mismatch_reason)",
			)
			.eq("room_id", room)
			.eq("user_id", user)
			.order("created_at", { ascending: false }),
		supabase
			.from("pilot_attendance")
			.select("attendance_date,approved,reason")
			.eq("room_id", room)
			.eq("user_id", user),
		supabase
			.from("pilot_disputes")
			.select("id,attendance_date,reason,resolution,resolved_at")
			.eq("room_id", room)
			.eq("user_id", user),
		supabase
			.from("equb_ledger")
			.select("id,type,amount,payout_jobs(status,last_error,confirmed_at)")
			.eq("room_id", room)
			.eq("user_id", user),
		supabase
			.from("equb_members")
			.select("qualified,payout_amount")
			.eq("room_id", room)
			.eq("user_id", user)
			.maybeSingle(),
	]);
	for (const result of responses) if (result.error) throw new Error(result.error.message);
	return c.json({
		data: {
			enrollments: responses[0]?.data,
			attendance: responses[1]?.data,
			disputes: responses[2]?.data,
			money: normalizePayoutJobs(responses[3]?.data),
			member: responses[4]?.data,
		},
		error: null,
	});
});
pilots.post("/:id/enroll", rateLimit(5, 60_000), async (c) => {
	if (process.env.PILOT_CHECKOUT_ENABLED !== "true")
		return c.json({ data: null, error: "Pilot checkout is not enabled" }, 503);
	const room = uuid.parse(c.req.param("id"));
	const user = await pilotActor(c);
	const body = z
		.object({
			terms_version: z.string().min(1),
			source: z.string().max(100).default("direct"),
			bank_code: z.string().min(1),
			account_number: z.string().regex(/^[0-9]{5,30}$/),
			account_name: z.string().trim().min(2).max(100),
		})
		.parse(await c.req.json());
	const banks = await getBanks();
	if (!banks.some((b) => b.id === body.bank_code))
		return c.json({ data: null, error: "Choose an available payout bank or wallet" }, 400);
	const intent = z
		.object({
			tx_ref: z.string(),
			expected_amount: z.coerce.number(),
			checkout_url: z.string().nullable(),
			checkout_status: z.string(),
			status: z.string(),
			created: z.boolean(),
		})
		.parse(
			await pilotRpc("pilot_prepare_enrollment", {
				p_room: room,
				p_user: user,
				p_terms: body.terms_version,
				p_source: body.source,
				p_bank: body.bank_code,
				p_account: body.account_number,
				p_name: body.account_name,
			}),
		);
	if (!intent.created) return c.json({ data: intent, error: null });
	try {
		const result = await initializePayment({
			amount: intent.expected_amount,
			currency: "ETB",
			tx_ref: intent.tx_ref,
			callback_url: `${process.env.API_URL}/webhooks/chapa`,
			return_url: `${process.env.TELEGRAM_MINI_APP_URL}/pilot/${room}?payment=${encodeURIComponent(intent.tx_ref)}`,
			first_name: body.account_name,
		});
		if (result.status !== "success" || !result.data?.checkout_url)
			throw new Error(result.message || "Checkout initialization is unresolved");
		const { error } = await supabase
			.from("payment_intents")
			.update({ checkout_status: "ready", checkout_url: result.data.checkout_url })
			.eq("tx_ref", intent.tx_ref);
		if (error) throw new Error(error.message);
		return c.json({
			data: { ...intent, checkout_status: "ready", checkout_url: result.data.checkout_url },
			error: null,
		});
	} catch {
		await supabase
			.from("payment_intents")
			.update({ checkout_status: "unknown" })
			.eq("tx_ref", intent.tx_ref);
		return c.json(
			{
				data: { tx_ref: intent.tx_ref, status: "pending", checkout_status: "unknown" },
				error: null,
			},
			202,
		);
	}
});
pilots.post("/:id/withdraw", async (c) => {
	await pilotRpc("pilot_withdraw", {
		p_room: uuid.parse(c.req.param("id")),
		p_user: await pilotActor(c),
	});
	return c.json({ data: { status: "refund_requested" }, error: null });
});
pilots.post("/:id/disputes", async (c) => {
	const body = z
		.object({ date: z.string().date(), reason: z.string().trim().min(3).max(1000) })
		.parse(await c.req.json());
	await pilotRpc("pilot_open_dispute", {
		p_room: uuid.parse(c.req.param("id")),
		p_user: await pilotActor(c),
		p_date: body.date,
		p_reason: body.reason,
	});
	return c.json({ data: { recorded: true }, error: null });
});
pilots.get("/:id/staff", async (c) => {
	const room = uuid.parse(c.req.param("id"));
	await requirePilotStaff(c, room);
	const { data, error } = await supabase
		.from("equb_members")
		.select("user_id,completed_days,users(full_name)")
		.eq("room_id", room);
	if (error) throw new Error(error.message);
	return c.json({ data, error: null });
});
pilots.post("/:id/attendance", async (c) => {
	const room = uuid.parse(c.req.param("id"));
	const { actor } = await requirePilotStaff(c, room);
	const body = z
		.object({
			user_id: uuid,
			date: z.string().date(),
			approved: z.boolean().default(true),
			reason: z.string().trim().min(3).max(1000),
		})
		.parse(await c.req.json());
	await pilotRpc("pilot_record_attendance", {
		p_actor: actor,
		p_room: room,
		p_user: body.user_id,
		p_date: body.date,
		p_approved: body.approved,
		p_reason: body.reason,
	});
	return c.json({ data: { recorded: true }, error: null });
});
