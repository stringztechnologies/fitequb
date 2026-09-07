import { defineConfig } from "@playwright/test";
export default defineConfig({
	testDir: "./e2e",
	testMatch: "pilot.spec.ts",
	workers: 1,
	timeout: 30000,
	outputDir: "test-results/pilot",
	use: {
		baseURL: "http://127.0.0.1:5179",
		viewport: { width: 393, height: 852 },
		channel: process.env.CI ? undefined : "chrome",
		screenshot: "only-on-failure",
	},
	webServer: {
		command: "pnpm --filter @fitequb/web dev --host 127.0.0.1 --port 5179",
		url: "http://127.0.0.1:5179",
		reuseExistingServer: false,
		env: {
			VITE_API_URL: "http://127.0.0.1:55888",
			VITE_SUPABASE_URL: "http://127.0.0.1:55889",
			VITE_SUPABASE_ANON_KEY: "pilot-test-key",
		},
	},
});
