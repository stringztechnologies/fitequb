import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { captureApiException } from "./sentry.js";

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
	message?: string;
	data?: {
		tx_ref: string;
		status: string;
		amount: number | string;
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

export interface ChapaTransferResponse {
	status: string;
	message?: string;
	data?: unknown;
	http_status?: number;
}

export async function initializePayment(payload: ChapaInitPayload): Promise<ChapaInitResponse> {
	let res: Response;
	try {
		res = await fetch(`${CHAPA_BASE_URL}/transaction/initialize`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${getSecretKey()}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(15000),
		});
	} catch (error) {
		captureApiException(error, {
			operation: "chapa_initialize",
			payment_reference: payload.tx_ref,
		});
		throw error;
	}

	const body = (await readJson<Partial<ChapaInitResponse>>(res)) ?? {};
	if (!res.ok) {
		return {
			status: "failed",
			message: body.message ?? `Chapa initialize failed with HTTP ${res.status}`,
			data: { checkout_url: "" },
		};
	}

	return body as ChapaInitResponse;
}

export async function verifyPayment(txRef: string): Promise<ChapaVerifyResponse> {
	const res = await fetch(`${CHAPA_BASE_URL}/transaction/verify/${encodeURIComponent(txRef)}`, {
		signal: AbortSignal.timeout(15000),
		headers: {
			Authorization: `Bearer ${getSecretKey()}`,
		},
	});

	const body = (await readJson<ChapaVerifyResponse>(res)) ?? {
		status: "error",
		message: "Unable to parse Chapa verify response",
	};

	if (!res.ok) {
		throw new Error(body.message ?? `Chapa verify failed with HTTP ${res.status}`);
	}

	return body;
}

export async function initiateTransfer(
	payload: ChapaTransferPayload,
): Promise<ChapaTransferResponse> {
	const res = await fetch(`${CHAPA_BASE_URL}/transfers`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${getSecretKey()}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(15000),
	});

	let body: Partial<ChapaTransferResponse>;
	try {
		body = (await res.json()) as Partial<ChapaTransferResponse>;
	} catch {
		body = {};
	}

	return {
		status: body.status ?? "unknown",
		message: body.message,
		data: body.data,
		http_status: res.status,
	};
}

async function readJson<T>(res: Response): Promise<T | null> {
	try {
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

export function verifyChapaWebhook(body: string, signature: string): boolean {
	const secret = process.env.CHAPA_WEBHOOK_SECRET;
	if (!secret) return false;

	if (!signature) return false;
	const hash = createHmac("sha256", secret).update(body).digest("hex");
	if (hash.length !== signature.length) return false;
	return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// Validate provider responses at the network boundary; ambiguous responses never imply success.
export async function getBanks(): Promise<Array<{ id: string; name: string }>> {
	const response = await fetch(`${CHAPA_BASE_URL}/banks`, {
		headers: { Authorization: `Bearer ${getSecretKey()}` },
		signal: AbortSignal.timeout(15000),
	});
	const body: unknown = await response.json();
	const parsed = z
		.object({
			status: z.literal("success"),
			data: z.array(
				z.object({ id: z.union([z.number(), z.string()]).transform(String), name: z.string() }),
			),
		})
		.safeParse(body);
	if (!response.ok || !parsed.success) throw new Error("Unable to load payout banks");
	return parsed.data.data;
}
export async function verifyTransfer(
	reference: string,
): Promise<{ status: "confirmed" | "failed" | "pending"; raw: unknown }> {
	const response = await fetch(
		`${CHAPA_BASE_URL}/transfers/verify/${encodeURIComponent(reference)}`,
		{ headers: { Authorization: `Bearer ${getSecretKey()}` }, signal: AbortSignal.timeout(15000) },
	);
	const raw: unknown = await response.json();
	const parsed = z
		.object({
			status: z.string(),
			data: z.object({ status: z.string(), reference: z.string() }),
		})
		.safeParse(raw);
	if (
		!response.ok ||
		!parsed.success ||
		parsed.data.status !== "success" ||
		parsed.data.data.reference !== reference
	)
		return { status: "pending", raw };
	const status = parsed.data.data.status.toLowerCase();
	return {
		status:
			status === "success" || status === "completed"
				? "confirmed"
				: status === "failed" || status === "reverted"
					? "failed"
					: "pending",
		raw,
	};
}
