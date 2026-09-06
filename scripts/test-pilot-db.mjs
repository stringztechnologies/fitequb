import { spawnSync } from "node:child_process";
const url = process.env.PILOT_TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith("_test") || !process.env.PILOT_TEST_REST_URL) {
	console.error(
		"Set a disposable PILOT_TEST_DATABASE_URL ending in _test and PILOT_TEST_REST_URL. See docs/pilot/TESTING.md.",
	);
	process.exit(1);
}
const result = spawnSync(
	"pnpm",
	[
		"exec",
		"vitest",
		"run",
		"tests/pilot-db.test.ts",
		"tests/pilot-api.test.ts",
		"--no-file-parallelism",
	],
	{ stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
