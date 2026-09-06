import { z } from "zod";
import { initiateTransfer, verifyTransfer } from "./chapa.js";
import { supabase } from "./supabase.js";

const payout = z.object({
	id: z.string(),
	reference: z.string(),
	amount: z.coerce.number(),
	attempts: z.number(),
	account_name: z.string().nullable(),
	account_number: z.string().nullable(),
	bank_code: z.string().nullable(),
});
export async function reconcilePayouts() {
	const { data, error } = await supabase
		.from("payout_jobs")
		.select("id,reference")
		.in("status", ["processing", "sent"])
		.order("updated_at")
		.limit(50);
	if (error) throw new Error(error.message);
	let confirmed = 0;
	for (const job of data ?? []) {
		try {
			const result = await verifyTransfer(job.reference);
			const { error: updateError } = await supabase
				.from("payout_jobs")
				.update({
					...(result.status === "pending" ? {} : { status: result.status }),
					provider_response: result.raw,
					confirmed_at: result.status === "confirmed" ? new Date().toISOString() : null,
					last_error:
						result.status === "failed"
							? "Provider confirmed failure"
							: result.status === "pending"
								? "Provider delivery is pending or unresolved"
								: null,
				})
				.eq("id", job.id)
				.in("status", ["processing", "sent"]);
			if (updateError) throw new Error(updateError.message);
			if (result.status === "confirmed") confirmed++;
		} catch {
			await supabase
				.from("payout_jobs")
				.update({ last_error: "Provider verification unavailable; do not resend" })
				.eq("id", job.id)
				.in("status", ["processing", "sent"]);
		}
	}
	const { error: finishError } = await supabase.rpc("pilot_finish_refunds");
	if (finishError) throw new Error(finishError.message);
	return { confirmed };
}
export async function processPilotPayouts() {
	await reconcilePayouts();
	const { data, error } = await supabase
		.from("payout_jobs")
		.select("id,reference,amount,attempts,account_name,account_number,bank_code")
		.in("status", ["pending", "failed"])
		.not("bank_code", "is", null)
		.order("created_at")
		.limit(50);
	if (error) throw new Error(error.message);
	let submitted = 0;
	for (const job of z.array(payout).parse(data)) {
		if (!job.account_name || !job.account_number || !job.bank_code) continue;
		const { data: claim, error: claimError } = await supabase
			.from("payout_jobs")
			.update({
				status: "processing",
				claimed_at: new Date().toISOString(),
				attempts: job.attempts + 1,
			})
			.eq("id", job.id)
			.in("status", ["pending", "failed"])
			.select("id")
			.maybeSingle();
		if (claimError) throw new Error(claimError.message);
		if (!claim) continue;
		try {
			const result = await initiateTransfer({
				account_name: job.account_name,
				account_number: job.account_number,
				bank_code: job.bank_code,
				amount: job.amount,
				currency: "ETB",
				reference: job.reference,
			});
			// Even a failed submission response is reconciled before retrying.
			const { error: updateError } = await supabase
				.from("payout_jobs")
				.update({
					status: result.status === "success" ? "sent" : "processing",
					sent_at: result.status === "success" ? new Date().toISOString() : null,
					provider_response: result,
					last_error: result.status === "success" ? null : "Transfer outcome requires verification",
				})
				.eq("id", job.id)
				.eq("status", "processing");
			if (updateError) throw new Error(updateError.message);
			submitted++;
		} catch {
			await supabase
				.from("payout_jobs")
				.update({ last_error: "Ambiguous transfer; verify before retry" })
				.eq("id", job.id)
				.eq("status", "processing");
		}
	}
	return { submitted };
}
