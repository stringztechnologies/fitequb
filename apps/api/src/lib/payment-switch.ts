export const paymentsEnabled = () => process.env.PAYMENTS_ENABLED === "true";

export const paymentsUnavailable = {
	data: null,
	error: "Payments are temporarily unavailable",
} as const;
