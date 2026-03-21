import { Hono } from "hono";
import { z } from "zod";
import { verifyChapaWebhook } from "../lib/chapa.js";
import { supabase } from "../lib/supabase.js";

const chapaWebhookSchema = z.object({
	tx_ref: z.string().min(1),
	status: z.string(),
	amount: z.number(),
});

const webhooks = new Hono();

// POST /webhooks/chapa — Chapa payment webhook
webhooks.post("/chapa", async (c) => {
	const rawBody = await c.req.text();
	const signature = c.req.header("x-chapa-signature") ?? "";

	if (!verifyChapaWebhook(rawBody, signature)) {
		return c.json({ error: "Invalid signature" }, 401);
	}

	const parsed = chapaWebhookSchema.safeParse(JSON.parse(rawBody));
	if (!parsed.success) {
		return c.json({ error: "Invalid payload" }, 400);
	}
	const payload = parsed.data;

	if (payload.status !== "success") {
		return c.json({ status: "ignored" });
	}

	const txRef = payload.tx_ref;

	// Parse tx_ref: equb-{roomId}-{userId}-{timestamp}
	const parts = txRef.split("-");
	if (parts[0] !== "equb" || parts.length < 4) {
		// Could be a day pass payment — handle below
		if (txRef.startsWith("daypass-")) {
			return handleDayPassWebhook(txRef, payload.amount);
		}
		return c.json({ error: "Unknown tx_ref format" }, 400);
	}

	const roomId = parts[1];
	const userId = parts[2];

	if (!roomId || !userId) {
		return c.json({ error: "Invalid tx_ref" }, 400);
	}

	// Check idempotency — don't double-credit
	const { data: existingEntry } = await supabase
		.from("equb_ledger")
		.select("id")
		.eq("tx_ref", txRef)
		.single();

	if (existingEntry) {
		return c.json({ status: "already_processed" });
	}

	// Create member + ledger entry in parallel
	const [memberResult, ledgerResult] = await Promise.all([
		supabase
			.from("equb_members")
			.insert({ room_id: roomId, user_id: userId, completed_days: 0 })
			.select()
			.single(),
		supabase.from("equb_ledger").insert({
			room_id: roomId,
			user_id: userId,
			type: "stake",
			amount: payload.amount,
			tx_ref: txRef,
		}),
	]);

	if (memberResult.error) {
		return c.json({ error: memberResult.error.message }, 500);
	}

	// Check if room should activate (min_members reached)
	const { count } = await supabase
		.from("equb_members")
		.select("*", { count: "exact", head: true })
		.eq("room_id", roomId);

	const { data: room } = await supabase
		.from("equb_rooms")
		.select("min_members, status")
		.eq("id", roomId)
		.single();

	if (room?.status === "pending" && count !== null && count >= room.min_members) {
		await supabase.from("equb_rooms").update({ status: "active" }).eq("id", roomId);
	}

	return c.json({
		status: "ok",
		ledger: ledgerResult.error ? "failed" : "created",
	});
});

async function handleDayPassWebhook(txRef: string, _amount: number) {
	// Parse: daypass-{passId}-{timestamp}
	const parts = txRef.split("-");
	const passId = parts[1];

	if (!passId) {
		return new Response(JSON.stringify({ error: "Invalid daypass tx_ref" }), {
			status: 400,
		});
	}

	// Mark pass as active (payment confirmed)
	await supabase
		.from("day_passes")
		.update({ status: "active" })
		.eq("id", passId)
		.eq("status", "pending" as string);

	return new Response(JSON.stringify({ status: "ok" }));
}

export { webhooks };
