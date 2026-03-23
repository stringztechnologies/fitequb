import { createHash } from "node:crypto";

const QR_SECRET = process.env.QR_SECRET ?? "fitequb-qr-secret-v1";

export function generateDailyQR(gymId: string, date?: Date): string {
	const dateStr = (date ?? new Date()).toISOString().slice(0, 10);
	return createHash("sha256")
		.update(`${gymId}${dateStr}${QR_SECRET}`)
		.digest("hex")
		.slice(0, 12);
}

export function validateQR(qrCode: string, gymId: string, date?: Date): boolean {
	return qrCode === generateDailyQR(gymId, date);
}
