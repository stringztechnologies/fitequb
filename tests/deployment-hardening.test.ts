import { describe, expect, it } from "vitest";
import { requireProductionWebEnv } from "../apps/web/vite.config.js";

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
