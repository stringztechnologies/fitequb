import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 30000,
	use: {
		baseURL: "https://fitequb.com",
		screenshot: "only-on-failure",
		viewport: { width: 393, height: 852 },
	},
	projects: [
		{
			name: "mobile",
			use: { viewport: { width: 393, height: 852 } },
		},
	],
});
