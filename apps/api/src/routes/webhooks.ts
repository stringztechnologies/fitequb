import { Hono } from "hono";
import { z } from "zod";
import { verifyChapaWebhook, verifyPayment } from "../lib/chapa.js";
import type { ChapaVerifyResponse } from "../lib/chapa.js";
import { reconcilePilotReceipt } from "../lib/pilot-receipts.js";
import { supabase } from "../lib/supabase.js";

const chapaWebhookSchema = z
	.object({
		tx_ref: z.string().min(1),
		status: z.string().optional(),
		amount: z.coerce.number().optional(),
	})
	.passthrough();

type PaymentIntentKind = "stake" | "daypass" | "duel" | "coach" | "pilot_enrollment";

interface PaymentIntentRow {
	kind: PaymentIntentKind;
	status: string;
}

const webhooks = new Hono();

// POST /webhooks/chapa - Chapa payment webhook
webhooks.post("/chapa", async (c) => {
	const rawBody = await c.req.text();
	const signature = c.req.header("x-chapa-signature") ?? "";

	if (!verifyChapaWebhook(rawBody, signature)) {
		return c.json({ error: "Invalid signature" }, 401);
	}

	let payloadJson: unknown;
	try {
		payloadJson = JSON.parse(rawBody);
	} catch {
		return c.json({ error: "Invalid JSON payload" }, 400);
	}

	const parsed = chapaWebhookSchema.safeParse(payloadJson);
	if (!parsed.success) {
		return c.json({ error: "Invalid payload" }, 400);
	}

	const payload = parsed.data;
	const txRef = payload.tx_ref;

	const { data: intent } = await supabase
		.from("payment_intents")
		.select("kind, status")
		.eq("tx_ref", txRef)
		.single<PaymentIntentRow>();

	if (!intent) {
		// Unknown references should not create endless provider retries.
		return c.json({ status: "ignored", reason: "unknown_tx_ref" });
	}

	if (intent.kind === "pilot_enrollment") {
		if (["credited", "mismatch", "refund_requested", "refunded"].includes(intent.status))
			return c.json({ data: { status: intent.status }, error: null });
		try {
			return c.json({ data: await reconcilePilotReceipt(txRef), error: null });
		} catch {
			return c.json({ data: null, error: "Provider verification is unresolved" }, 503);
		}
	}
	if (intent.status === "credited") {
		return c.json({ status: "already_processed" });
	}

	if (payload.status && payload.status !== "success") {
		await supabase
			.from("payment_intents")
			.update({
				status: "failed",
				provider_status: payload.status,
				provider_amount: payload.amount ?? null,
			})
			.eq("tx_ref", txRef);
		return c.json({ status: "ignored", reason: "provider_status_not_success" });
	}

	let verified: ChapaVerifyResponse;
	try {
		verified = await verifyPayment(txRef);
	} catch (error) {
		return c.json(
			{
				error: error instanceof Error ? error.message : "Unable to verify payment with Chapa",
			},
			503,
		);
	}

	const verifiedData = verified.data;
	const verifiedStatus = verifiedData?.status ?? verified.status;
	if (isFinalPaymentFailure(verifiedStatus)) {
		await supabase
			.from("payment_intents")
			.update({
				status: "failed",
				provider_status: verifiedStatus,
				mismatch_reason: verified.message ?? "payment_not_successful",
			})
			.eq("tx_ref", txRef);
		return c.json({ status: "ignored", reason: "verified_payment_not_successful" });
	}

	if (verified.status !== "success" || verifiedStatus !== "success" || !verifiedData) {
		return c.json(
			{
				error: verified.message ?? "Unable to verify payment status with Chapa",
			},
			503,
		);
	}

	if (verifiedData.tx_ref !== txRef) {
		await supabase
			.from("payment_intents")
			.update({
				status: "mismatch",
				provider_status: verifiedStatus,
				mismatch_reason: "verified_tx_ref_mismatch",
			})
			.eq("tx_ref", txRef);
		return c.json({ status: "mismatch", reason: "verified_tx_ref_mismatch" });
	}

	if (verifiedData.currency !== "ETB")
		return c.json({ data: null, error: "Unexpected payment currency" }, 400);
	const paidAmount = Number(verifiedData.amount);
	if (!Number.isFinite(paidAmount)) {
		return c.json({ error: "Verified amount is invalid" }, 502);
	}

	await supabase
		.from("payment_intents")
		.update({
			status: "paid",
			provider_status: verifiedStatus,
			provider_amount: paidAmount,
		})
		.eq("tx_ref", txRef);

	const rpcName = getCreditRpc(intent.kind);
	const { data, error } = await supabase.rpc(rpcName, {
		p_tx_ref: txRef,
		p_paid_amount: paidAmount,
	});

	if (error) {
		return c.json({ error: error.message }, 500);
	}

	return c.json({ status: "ok", result: data });
});

function getCreditRpc(kind: PaymentIntentKind) {
	switch (kind) {
		case "stake":
		case "duel":
			return "apply_stake_payment";
		case "daypass":
			return "activate_day_pass_payment";
		case "coach":
			return "activate_coach_pass_payment";
		case "pilot_enrollment":
			throw new Error("Pilot uses verified allocation");
	}
}

function isFinalPaymentFailure(status: string | undefined) {
	return status === "failed" || status === "cancelled" || status === "canceled";
}

export { webhooks };
