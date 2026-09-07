import { afterEach, describe, expect, it, vi } from "vitest";
import { initializePayment } from "../apps/api/src/lib/chapa.js";
import { paymentReferenceTag } from "../apps/api/src/lib/sentry.js";
import { requireProductionWebEnv } from "../apps/web/vite.config.js";

afterEach(() => {
	vi.unstubAllGlobals();
	process.env.PAYMENTS_ENABLED = undefined;
});

describe("payment collection switch", () => {
	it("blocks Chapa initialization at the provider boundary", async () => {
		process.env.PAYMENTS_ENABLED = "false";
		process.env.CHAPA_SECRET_KEY = "test-only";
		const provider = vi.fn();
		vi.stubGlobal("fetch", provider);
		await expect(
			initializePayment({
				amount: 800,
				currency: "ETB",
				tx_ref: "pi_test_reference",
				callback_url: "https://api.example.test/webhooks/chapa",
				return_url: "https://example.test/payment",
				first_name: "Test",
			}),
		).rejects.toThrow("Payments are temporarily unavailable");
		expect(provider).not.toHaveBeenCalled();
	});

	it("uses a stable non-reversible payment reference tag", () => {
		const raw = "pi_pilot_enrollment_sensitive-reference";
		const tag = paymentReferenceTag(raw);
		expect(tag).toHaveLength(16);
		expect(tag).not.toContain(raw);
		expect(tag).toBe(paymentReferenceTag(raw));
	});
});

describe("production web configuration", () => {
	it("requires API and Supabase build variables", () => {
		expect(() => requireProductionWebEnv({})).toThrow(
			"Missing production web variables: VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY",
		);
	});

	it("rejects localhost production endpoints", () => {
		expect(() =>
			requireProductionWebEnv({
				VITE_API_URL: "http://localhost:3000",
				VITE_SUPABASE_URL: "https://example.supabase.co",
				VITE_SUPABASE_ANON_KEY: "public-key",
			}),
		).toThrow("Production web variables must not use localhost");
	});

	it("accepts non-secret production URLs and the public anon key", () => {
		expect(() =>
			requireProductionWebEnv({
				VITE_API_URL: "https://api.fitequb.com",
				VITE_SUPABASE_URL: "https://ufkkisleoimltqbnexpf.supabase.co",
				VITE_SUPABASE_ANON_KEY: "public-key",
			}),
		).not.toThrow();
	});
});
