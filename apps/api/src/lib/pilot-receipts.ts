import { verifyPayment } from "./chapa.js";
import { pilotRpc } from "./pilot.js";

export async function reconcilePilotReceipt(txRef: string) {
	const result = await verifyPayment(txRef);
	if (!result.data || result.data.tx_ref !== txRef)
		throw new Error("Provider receipt reference could not be verified");
	const amount = Number(result.data.amount);
	if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid provider amount");
	if (result.status !== "success") throw new Error("Provider verification is unresolved");
	return pilotRpc("pilot_credit_payment", {
		p_tx_ref: txRef,
		p_amount: amount,
		p_currency: result.data.currency,
		p_status: result.data.status,
	});
}
