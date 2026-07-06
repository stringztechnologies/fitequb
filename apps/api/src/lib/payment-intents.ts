import { randomUUID } from "node:crypto";
import { supabase } from "./supabase.js";

export type PaymentIntentKind = "stake" | "daypass" | "duel" | "coach";

interface CreatePaymentIntentInput {
	kind: PaymentIntentKind;
	targetId: string;
	userId: string;
	expectedAmount: number;
	metadata?: Record<string, unknown>;
}

export function createPaymentTxRef(kind: PaymentIntentKind): string {
	return `pi_${kind}_${randomUUID()}`;
}

export async function createPaymentIntent({
	kind,
	targetId,
	userId,
	expectedAmount,
	metadata = {},
}: CreatePaymentIntentInput) {
	const txRef = createPaymentTxRef(kind);
	const { error } = await supabase.from("payment_intents").insert({
		tx_ref: txRef,
		kind,
		target_id: targetId,
		user_id: userId,
		expected_amount: expectedAmount,
		currency: "ETB",
		status: "created",
		metadata,
	});

	if (error) {
		throw new Error(error.message);
	}

	return txRef;
}

export async function markPaymentIntentFailed(txRef: string, reason: string) {
	await supabase
		.from("payment_intents")
		.update({ status: "failed", mismatch_reason: reason })
		.eq("tx_ref", txRef);
}
