import { createHmac, timingSafeEqual } from "node:crypto";

const CHAPA_BASE_URL = "https://api.chapa.co/v1";

function getSecretKey(): string {
	const key = process.env.CHAPA_SECRET_KEY;
	if (!key) throw new Error("Missing CHAPA_SECRET_KEY");
	return key;
}

export interface ChapaInitPayload {
	amount: number;
	currency: "ETB";
	tx_ref: string;
	callback_url: string;
	return_url: string;
	first_name: string;
	last_name?: string;
	phone_number?: string;
}

export interface ChapaInitResponse {
	status: string;
	message: string;
	data: {
		checkout_url: string;
	};
}

export interface ChapaVerifyResponse {
	status: string;
	data: {
		tx_ref: string;
		status: string;
		amount: number;
		currency: string;
	};
}

export interface ChapaTransferPayload {
	account_name: string;
	account_number: string;
	amount: number;
	currency: "ETB";
	reference: string;
	bank_code: string;
}

export async function initializePayment(payload: ChapaInitPayload): Promise<ChapaInitResponse> {
	const res = await fetch(`${CHAPA_BASE_URL}/transaction/initialize`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${getSecretKey()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	return res.json() as Promise<ChapaInitResponse>;
}

export async function verifyPayment(txRef: string): Promise<ChapaVerifyResponse> {
	const res = await fetch(`${CHAPA_BASE_URL}/transaction/verify/${txRef}`, {
		headers: {
			Authorization: `Bearer ${getSecretKey()}`,
		},
	});

	return res.json() as Promise<ChapaVerifyResponse>;
}

export async function initiateTransfer(payload: ChapaTransferPayload) {
	const res = await fetch(`${CHAPA_BASE_URL}/transfers`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${getSecretKey()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	return res.json();
}

export function verifyChapaWebhook(body: string, signature: string): boolean {
	const secret = process.env.CHAPA_WEBHOOK_SECRET;
	if (!secret) return false;

	if (!signature) return false;
	const hash = createHmac("sha256", secret).update(body).digest("hex");
	if (hash.length !== signature.length) return false;
	return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
