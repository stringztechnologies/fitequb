import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

// ── Settlement Math ──

describe("Settlement math", () => {
	const HOUSE_FEE_PCT = 0.05;

	function calculateSettlement(stakeAmount: number, memberCount: number, qualifiedCount: number) {
		const totalPot = stakeAmount * memberCount;
		const houseFee = Math.round(totalPot * HOUSE_FEE_PCT);
		const distributablePot = totalPot - houseFee;
		const payoutPerWinner = qualifiedCount > 0 ? Math.floor(distributablePot / qualifiedCount) : 0;
		const remainder = distributablePot - payoutPerWinner * qualifiedCount;
		return { totalPot, houseFee, distributablePot, payoutPerWinner, remainder };
	}

	it("calculates correct payout for 20 members, 15 qualified", () => {
		const result = calculateSettlement(500, 20, 15);
		expect(result.totalPot).toBe(10000);
		expect(result.houseFee).toBe(500);
		expect(result.distributablePot).toBe(9500);
		expect(result.payoutPerWinner).toBe(633);
		expect(result.houseFee + result.payoutPerWinner * 15 + result.remainder).toBe(result.totalPot);
	});

	it("handles zero qualified members", () => {
		const result = calculateSettlement(1000, 10, 0);
		expect(result.totalPot).toBe(10000);
		expect(result.payoutPerWinner).toBe(0);
	});

	it("handles free equb (stake = 0)", () => {
		const result = calculateSettlement(0, 20, 18);
		expect(result.totalPot).toBe(0);
		expect(result.houseFee).toBe(0);
		expect(result.payoutPerWinner).toBe(0);
	});

	it("preserves total: house_fee + payouts = total_pot", () => {
		const stakes = [100, 250, 500, 1000];
		const members = [3, 5, 10, 15, 20];
		for (const stake of stakes) {
			for (const count of members) {
				for (let q = 1; q <= count; q++) {
					const r = calculateSettlement(stake, count, q);
					expect(r.houseFee + r.payoutPerWinner * q + r.remainder).toBe(r.totalPot);
				}
			}
		}
	});
});

// ── Chapa Webhook HMAC ──

describe("Chapa webhook HMAC verification", () => {
	function verifyChapaWebhook(body: string, signature: string, secret: string): boolean {
		const hash = createHmac("sha256", secret).update(body).digest("hex");
		return hash === signature;
	}

	it("accepts valid signature", () => {
		const secret = "test-webhook-secret";
		const body = '{"tx_ref":"equb-123-456-789","status":"success","amount":500}';
		const validSig = createHmac("sha256", secret).update(body).digest("hex");
		expect(verifyChapaWebhook(body, validSig, secret)).toBe(true);
	});

	it("rejects invalid signature", () => {
		const secret = "test-webhook-secret";
		const body = '{"tx_ref":"equb-123-456-789","status":"success","amount":500}';
		expect(verifyChapaWebhook(body, "invalid-signature", secret)).toBe(false);
	});

	it("rejects tampered body", () => {
		const secret = "test-webhook-secret";
		const body = '{"tx_ref":"equb-123-456-789","status":"success","amount":500}';
		const sig = createHmac("sha256", secret).update(body).digest("hex");
		const tampered = body.replace("500", "50000");
		expect(verifyChapaWebhook(tampered, sig, secret)).toBe(false);
	});
});

// ── Telegram initData Validation ──

describe("Telegram initData validation", () => {
	const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;
	const MAX_INIT_DATA_FUTURE_SKEW_SECONDS = 5 * 60;

	function validateInitData(initData: string, botToken: string): boolean {
		const params = new URLSearchParams(initData);
		const hash = params.get("hash");
		const authDate = params.get("auth_date");
		if (!hash || !authDate) return false;
		if (!isFreshAuthDate(authDate)) return false;

		params.delete("hash");
		const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
		const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

		const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
		const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

		return computedHash === hash;
	}

	function isFreshAuthDate(authDate: string): boolean {
		const parsed = Number(authDate);
		if (!Number.isInteger(parsed)) return false;

		const nowSeconds = Math.floor(Date.now() / 1000);
		if (parsed > nowSeconds + MAX_INIT_DATA_FUTURE_SKEW_SECONDS) return false;
		return nowSeconds - parsed <= MAX_INIT_DATA_AGE_SECONDS;
	}

	const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

	function createValidInitData(
		token: string,
		user: object,
		authDate = Math.floor(Date.now() / 1000),
	): string {
		const params = new URLSearchParams();
		params.set("user", JSON.stringify(user));
		params.set("auth_date", String(authDate));

		const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
		const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
		const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
		const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

		params.set("hash", hash);
		return params.toString();
	}

	it("validates correctly signed initData", () => {
		const initData = createValidInitData(botToken, { id: 12345, first_name: "Test" });
		expect(validateInitData(initData, botToken)).toBe(true);
	});

	it("rejects initData with wrong bot token", () => {
		const initData = createValidInitData(botToken, { id: 12345, first_name: "Test" });
		expect(validateInitData(initData, "wrong:token")).toBe(false);
	});

	it("rejects initData with missing hash", () => {
		const params = new URLSearchParams();
		params.set("user", JSON.stringify({ id: 12345 }));
		params.set("auth_date", String(Math.floor(Date.now() / 1000)));
		expect(validateInitData(params.toString(), botToken)).toBe(false);
	});

	it("rejects stale initData even when signature is valid", () => {
		const staleAuthDate = Math.floor(Date.now() / 1000) - MAX_INIT_DATA_AGE_SECONDS - 1;
		const initData = createValidInitData(
			botToken,
			{ id: 12345, first_name: "Test" },
			staleAuthDate,
		);
		expect(validateInitData(initData, botToken)).toBe(false);
	});

	it("rejects tampered user data", () => {
		const initData = createValidInitData(botToken, { id: 12345, first_name: "Test" });
		const tampered = initData.replace("12345", "99999");
		expect(validateInitData(tampered, botToken)).toBe(false);
	});
});

// ── Level System ──

describe("Level system", () => {
	const LEVEL_THRESHOLDS = [
		{ level: 1, name: "Starter", min_points: 0, perk: null },
		{ level: 2, name: "Mover", min_points: 100, perk: null },
		{ level: 3, name: "Hustler", min_points: 500, perk: "5% fee discount" },
		{ level: 4, name: "Champion", min_points: 1500, perk: "Priority room access" },
		{ level: 5, name: "Legend", min_points: 5000, perk: "VIP badge + 10% fee discount" },
	];

	function getLevelForPoints(points: number) {
		let result = LEVEL_THRESHOLDS[0] as (typeof LEVEL_THRESHOLDS)[number];
		for (const t of LEVEL_THRESHOLDS) {
			if (points >= t.min_points) result = t;
		}
		return result;
	}

	it("assigns Starter for 0 points", () => {
		expect(getLevelForPoints(0).name).toBe("Starter");
	});

	it("assigns Mover for 100 points", () => {
		expect(getLevelForPoints(100).name).toBe("Mover");
	});

	it("assigns Hustler for 500 points", () => {
		expect(getLevelForPoints(500).name).toBe("Hustler");
	});

	it("assigns Legend for 5000+ points", () => {
		expect(getLevelForPoints(10000).name).toBe("Legend");
	});

	it("stays at current level just below threshold", () => {
		expect(getLevelForPoints(99).name).toBe("Starter");
		expect(getLevelForPoints(499).name).toBe("Mover");
	});
});

// ── Payment Tx Ref Safety ──

describe("Payment transaction references", () => {
	function isOpaquePaymentIntentRef(txRef: string) {
		return /^pi_(stake|daypass|duel|coach)_[0-9a-f-]{36}$/.test(txRef);
	}

	it("uses opaque payment intent references", () => {
		expect(isOpaquePaymentIntentRef("pi_stake_550e8400-e29b-41d4-a716-446655440000")).toBe(true);
		expect(isOpaquePaymentIntentRef("pi_daypass_550e8400-e29b-41d4-a716-446655440000")).toBe(true);
		expect(isOpaquePaymentIntentRef("pi_duel_550e8400-e29b-41d4-a716-446655440000")).toBe(true);
		expect(isOpaquePaymentIntentRef("pi_coach_550e8400-e29b-41d4-a716-446655440000")).toBe(true);
	});

	it("rejects dashed UUID-embedded legacy references", () => {
		expect(
			isOpaquePaymentIntentRef(
				"equb-550e8400-e29b-41d4-a716-446655440000-650e8400-e29b-41d4-a716-446655440000-123",
			),
		).toBe(false);
	});

	it("rejects unknown prefixes", () => {
		expect(isOpaquePaymentIntentRef("unknown-ref")).toBe(false);
	});

	it("rejects empty strings", () => {
		expect(isOpaquePaymentIntentRef("")).toBe(false);
	});
});
