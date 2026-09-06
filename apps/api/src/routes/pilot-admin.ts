import { Hono } from "hono";
import { z } from "zod";
import { reconcilePayouts } from "../lib/pilot-payouts.js";
import { reconcilePilotReceipt } from "../lib/pilot-receipts.js";
import {
	getPilot,
	isPilotAdmin,
	normalizePayoutJobs,
	pilotActor,
	pilotConfigSchema,
	pilotRpc,
	uuid,
} from "../lib/pilot.js";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

export const pilotAdmin = new Hono<{ Variables: AppVariables }>();
pilotAdmin.use("*", async (c, next) => {
	const actor = await pilotActor(c);
	if (!(await isPilotAdmin(actor))) return c.json({ data: null, error: "Admin required" }, 403);
	await next();
});
pilotAdmin.get("/", async (c) => {
	const { data, error } = await supabase
		.from("pilot_configs")
		.select(
			"*,equb_rooms!pilot_configs_room_id_fkey(name,status,start_date,duration_days,workout_target,completion_pct,stake_amount,min_members,max_members)",
		)
		.order("created_at", { ascending: false })
		.limit(100);
	if (error) throw new Error(error.message);
	return c.json({ data, error: null });
});
pilotAdmin.post("/", async (c) => {
	const body = z
		.object({ room_id: uuid.optional(), config: pilotConfigSchema })
		.parse(await c.req.json());
	const id = await pilotRpc("pilot_configure", {
		p_actor: await pilotActor(c),
		p_room: body.room_id ?? null,
		p_config: body.config,
	});
	return c.json({ data: { room_id: id }, error: null });
});
pilotAdmin.post("/:id/settings", async (c) => {
	const room = uuid.parse(c.req.param("id"));
	const body = z
		.object({
			published: z.boolean().optional(),
			checkout_ready: z.boolean().optional(),
			settlement_hold: z.boolean().optional(),
			next_room_id: uuid.nullable().optional(),
		})
		.strict()
		.parse(await c.req.json());
	if (body.next_room_id === room) throw new Error("Renewal cohort must be different");
	if (body.next_room_id) {
		const [current, next] = await Promise.all([getPilot(room), getPilot(body.next_room_id)]);
		const boundaries = z.object({ start_date: z.string(), end_date: z.string() });
		const currentDates = boundaries.safeParse(current?.equb_rooms);
		const nextDates = boundaries.safeParse(next?.equb_rooms);
		if (
			!currentDates.success ||
			!nextDates.success ||
			Date.parse(nextDates.data.start_date) < Date.parse(currentDates.data.end_date)
		)
			return c.json(
				{ data: null, error: "Renewal must be a configured pilot starting after this cohort ends" },
				400,
			);
	}
	if (body.checkout_ready) {
		const { data, error } = await supabase
			.from("pilot_staff")
			.select("user_id")
			.eq("room_id", room)
			.limit(1);
		if (error || !data?.length) throw new Error("Assign staff before enabling checkout");
	}
	const { error } = await supabase.from("pilot_configs").update(body).eq("room_id", room);
	if (error) throw new Error(error.message);
	return c.json({ data: { updated: true }, error: null });
});
pilotAdmin.post("/:id/staff", async (c) => {
	const body = z
		.object({ user_id: uuid, remove: z.boolean().default(false) })
		.parse(await c.req.json());
	const room = uuid.parse(c.req.param("id"));
	const result = body.remove
		? await supabase.from("pilot_staff").delete().eq("room_id", room).eq("user_id", body.user_id)
		: await supabase.from("pilot_staff").upsert({ room_id: room, user_id: body.user_id });
	if (result.error) throw new Error(result.error.message);
	return c.json({ data: { updated: true }, error: null });
});
pilotAdmin.post("/:id/cancel", async (c) => {
	await pilotRpc("pilot_cancel", {
		p_actor: await pilotActor(c),
		p_room: uuid.parse(c.req.param("id")),
	});
	return c.json({ data: { status: "cancelled" }, error: null });
});
pilotAdmin.post("/refund", async (c) => {
	const { tx_ref } = z.object({ tx_ref: z.string().min(1) }).parse(await c.req.json());
	await pilotRpc("pilot_refund_mismatch", { p_actor: await pilotActor(c), p_ref: tx_ref });
	return c.json({ data: { status: "refund_requested" }, error: null });
});
pilotAdmin.post("/reconcile", async (c) => c.json({ data: await reconcilePayouts(), error: null }));
pilotAdmin.post("/receipts/reconcile", async (c) => {
	const { tx_ref } = z.object({ tx_ref: z.string().min(1) }).parse(await c.req.json());
	return c.json({ data: await reconcilePilotReceipt(tx_ref), error: null });
});
pilotAdmin.post("/:id/disputes/:dispute/resolve", async (c) => {
	const { resolution } = z
		.object({ resolution: z.string().trim().min(3).max(1000) })
		.parse(await c.req.json());
	const { error } = await supabase
		.from("pilot_disputes")
		.update({ resolution, resolved_by: await pilotActor(c), resolved_at: new Date().toISOString() })
		.eq("id", uuid.parse(c.req.param("dispute")))
		.eq("room_id", uuid.parse(c.req.param("id")))
		.is("resolved_at", null);
	if (error) throw new Error(error.message);
	return c.json({ data: { resolved: true }, error: null });
});
pilotAdmin.post("/:id/prospects", async (c) => {
	const body = z
		.object({
			label: z.string().trim().min(1).max(100),
			source: z.string().max(100),
			stage: z.enum(["introduced", "offered", "declined", "renewal_offered"]),
			user_id: uuid.nullable().optional(),
			note: z.string().max(1000).default(""),
		})
		.parse(await c.req.json());
	const { error } = await supabase
		.from("pilot_prospects")
		.insert({ ...body, room_id: uuid.parse(c.req.param("id")) });
	if (error) throw new Error(error.message);
	return c.json({ data: { recorded: true }, error: null });
});
pilotAdmin.post("/:id/costs", async (c) => {
	const body = z
		.object({
			description: z.string().trim().min(2).max(200),
			amount: z.number().min(0).multipleOf(0.01).default(0),
			minutes: z.number().int().min(0).default(0),
			estimated: z.boolean().default(false),
		})
		.parse(await c.req.json());
	const { error } = await supabase
		.from("pilot_costs")
		.insert({ ...body, room_id: uuid.parse(c.req.param("id")) });
	if (error) throw new Error(error.message);
	return c.json({ data: { recorded: true }, error: null });
});
const receipt = z
	.object({
		tx_ref: z.string(),
		user_id: z.string(),
		state: z.string(),
		source: z.string(),
		program_fee: z.coerce.number(),
		enrolled_at: z.string().nullable(),
	})
	.passthrough();
const entry = z
	.object({
		id: z.string(),
		type: z.string(),
		amount: z.coerce.number(),
		payment_intent_ref: z.string().nullable(),
	})
	.passthrough();
pilotAdmin.get("/:id/report", async (c) => {
	const room = uuid.parse(c.req.param("id"));
	const results = await Promise.all([
		supabase
			.from("pilot_enrollments")
			.select(
				"tx_ref,user_id,state,source,program_fee,stake_amount,enrolled_at,payment_intents(status,mismatch_reason,provider_amount,provider_currency)",
			)
			.eq("room_id", room),
		supabase
			.from("equb_ledger")
			.select("id,type,amount,payment_intent_ref,payout_jobs(id,status,last_error,confirmed_at)")
			.eq("room_id", room),
		supabase
			.from("pilot_attendance")
			.select("user_id,attendance_date,approved")
			.eq("room_id", room),
		supabase.from("pilot_disputes").select("*").eq("room_id", room),
		supabase.from("pilot_costs").select("*").eq("room_id", room),
		supabase.from("pilot_prospects").select("*").eq("room_id", room),
		supabase
			.from("pilot_configs")
			.select("next_room_id,equb_rooms!pilot_configs_room_id_fkey(end_date)")
			.eq("room_id", room)
			.single(),
	]);
	for (const r of results) if (r.error) throw new Error(r.error.message);
	const enrollments = z.array(receipt).parse(results[0]?.data);
	const ledger = z.array(entry).parse(normalizePayoutJobs(results[1]?.data));
	const costs = z
		.array(z.object({ amount: z.coerce.number(), minutes: z.number(), estimated: z.boolean() }))
		.parse(results[4]?.data);
	const next = z
		.object({ next_room_id: z.string().nullable(), equb_rooms: z.object({ end_date: z.string() }) })
		.parse(results[6]?.data);
	const attendance = z
		.array(z.object({ user_id: z.string(), attendance_date: z.string(), approved: z.boolean() }))
		.parse(results[2]?.data);
	const prospects = z
		.array(z.object({ user_id: z.string().nullable(), stage: z.string(), created_at: z.string() }))
		.parse(results[5]?.data);
	const original = enrollments.filter(
		(e) =>
			e.enrolled_at &&
			e.program_fee > 0 &&
			!ledger.some((l) => l.payment_intent_ref === e.tx_ref && l.type === "program_refund"),
	);
	let renewalUsers = new Set<string>();
	if (next.next_room_id) {
		const { data, error } = await supabase
			.from("pilot_enrollments")
			.select("user_id,program_fee,tx_ref,enrolled_at")
			.eq("room_id", next.next_room_id)
			.eq("state", "enrolled");
		if (error) throw new Error(error.message);
		renewalUsers = new Set(
			z
				.array(
					z.object({
						user_id: z.string(),
						program_fee: z.coerce.number(),
						enrolled_at: z.string(),
					}),
				)
				.parse(data)
				.filter((e) =>
					original.some(
						(o) =>
							o.user_id === e.user_id &&
							e.program_fee > 0 &&
							Date.parse(e.enrolled_at) >= Date.parse(o.enrolled_at ?? ""),
					),
				)
				.map((e) => e.user_id),
		);
	}
	const total = (kind: string) =>
		ledger.filter((l) => l.type === kind).reduce((sum, l) => sum + l.amount, 0);
	const actualCosts = costs.filter((x) => !x.estimated).reduce((sum, x) => sum + x.amount, 0);
	const payables = ledger.filter((l) =>
		["payout", "refund", "program_refund", "payment_refund"].includes(l.type),
	);
	const delivered = payables
		.filter((l) =>
			z
				.array(z.object({ status: z.string() }))
				.parse(l.payout_jobs)
				.some((j) => j.status === "confirmed"),
		)
		.reduce((sum, l) => sum + l.amount, 0);
	const metrics = {
		fee_payers: original.length,
		paid_renewals: renewalUsers.size,
		program_collected: total("program_fee"),
		program_refunds: total("program_refund"),
		stakes: total("stake"),
		stake_refunds: total("refund"),
		house_fees: total("fee"),
		payout_obligations: total("payout"),
		unapplied_refunds: total("payment_refund"),
		actual_costs: actualCosts,
		estimated_costs: costs.filter((x) => x.estimated).reduce((s, x) => s + x.amount, 0),
		operator_minutes: costs.filter((x) => !x.estimated).reduce((s, x) => s + x.minutes, 0),
		estimated_operator_minutes: costs.filter((x) => x.estimated).reduce((s, x) => s + x.minutes, 0),
		first_attendance_members: new Set(attendance.filter((a) => a.approved).map((a) => a.user_id))
			.size,
		approved_attendance_days: attendance.filter((a) => a.approved).length,
		transfers_delivered: delivered,
		transfers_outstanding: payables.reduce((sum, l) => sum + l.amount, 0) - delivered,
		stake_balance: total("stake") - total("refund") - total("payout") - total("fee"),
		direct_contribution:
			total("program_fee") - total("program_refund") + total("fee") - actualCosts,
	};
	const cell = (v: unknown) =>
		`"${String(v ?? "")
			.replace(/^\s*[=+@-]/, "'$&")
			.replaceAll('"', '""')}"`;
	const rows = [
		[
			"user_id",
			"source",
			"state",
			"program_fee",
			"enrolled_at",
			"first_approved_attendance",
			"approved_days",
			"program_refund",
			"renewal_offered_at",
			"paid_renewal",
		],
		...enrollments.map((e) => [
			e.user_id,
			e.source,
			e.state,
			e.program_fee,
			e.enrolled_at,
			attendance
				.filter((a) => a.user_id === e.user_id && a.approved)
				.map((a) => a.attendance_date)
				.sort()[0] ?? "",
			attendance.filter((a) => a.user_id === e.user_id && a.approved).length,
			ledger
				.filter((l) => l.payment_intent_ref === e.tx_ref && l.type === "program_refund")
				.reduce((sum, l) => sum + l.amount, 0),
			prospects
				.filter((p) => p.user_id === e.user_id && p.stage === "renewal_offered")
				.map((p) => p.created_at)
				.sort()[0] ?? "",
			renewalUsers.has(e.user_id),
		]),
	];
	const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n");
	if (c.req.query("format") === "csv") {
		c.header("Content-Type", "text/csv; charset=utf-8");
		c.header("Content-Disposition", 'attachment; filename="pilot-cohort.csv"');
		return c.body(csv);
	}
	return c.json({
		data: {
			csv,
			metrics,
			enrollments,
			ledger,
			attendance: results[2]?.data,
			disputes: results[3]?.data,
			costs: results[4]?.data,
			prospects: results[5]?.data,
		},
		error: null,
	});
});
