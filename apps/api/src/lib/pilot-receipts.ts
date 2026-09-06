import { z } from "zod";
import { verifyPayment } from "./chapa.js";
import { pilotRpc } from "./pilot.js";

export async function reconcilePilotReceipt(txRef: string) {
	const result = z
		.object({
			status: z.literal("success"),
			data: z.object({
				tx_ref: z.string(),
				status: z.string().min(1),
				amount: z.coerce.number().finite().positive(),
				currency: z.string().length(3),
			}),
		})
		.parse(await verifyPayment(txRef));
	if (result.data.tx_ref !== txRef)
		throw new Error("Provider receipt reference could not be verified");
	return pilotRpc("pilot_credit_payment", {
		p_tx_ref: txRef,
		p_amount: result.data.amount,
		p_currency: result.data.currency,
		p_status: result.data.status,
	});
}
