import { type Page, expect, test } from "@playwright/test";
const room = "10000000-0000-4000-8000-000000000001";
const next = "10000000-0000-4000-8000-000000000002";
const user = {
	id: "20000000-0000-4000-8000-000000000001",
	full_name: "Pilot Member",
	telegram_id: 101,
};
const offer = {
	room_id: room,
	program_fee: 300,
	terms_version: "pilot-v1",
	checkout_enabled: true,
	next_room_id: next,
	coach_name: "Coach Abebe",
	partner_gyms: { name: "Partner gym", location: "Addis Ababa" },
	equb_rooms: {
		name: "30-day gym accountability",
		status: "pending",
		stake_amount: 500,
		start_date: "2030-09-10T21:00:00Z",
		end_date: "2030-10-10T21:00:00Z",
		workout_target: 12,
		completion_pct: 0.8,
		house_fee_pct: 5,
	},
};
async function setup(page: Page, telegram = false) {
	let enrolled = false;
	let pending = false;
	let attendance = false;
	if (telegram)
		await page.addInitScript(() => {
			Object.defineProperty(window, "Telegram", {
				configurable: true,
				value: {
					WebApp: {
						initData: "test-signed-in",
						initDataUnsafe: { user: { id: 101 } },
						ready() {},
						expand() {},
					},
				},
			});
		});
	await page.route("**/telegram-web-app.js", (r) => r.fulfill({ body: "" }));
	await page.route("http://127.0.0.1:55888/**", async (route) => {
		const req = route.request();
		const path = new URL(req.url()).pathname;
		let data: unknown = null;
		if (path.startsWith("/public/pilots/")) data = { ...offer, room_id: path.split("/").at(-1) };
		else if (path === "/api/auth/login" || path === "/web-auth/me") data = user;
		else if (path === "/api/pilots/banks") data = [{ id: "123", name: "Telebirr" }];
		else if (path.endsWith("/enroll")) {
			expect(req.postDataJSON()).toMatchObject({ terms_version: "pilot-v1", bank_code: "123" });
			pending = true;
			data = { tx_ref: "pi-test", status: "pending", checkout_status: "unknown" };
		} else if (path.endsWith("/staff"))
			data = [{ user_id: user.id, completed_days: 0, users: { full_name: user.full_name } }];
		else if (path.endsWith("/attendance")) {
			attendance = true;
			data = { recorded: true };
		} else if (path.endsWith("/disputes")) data = { recorded: true };
		else if (path.startsWith("/api/pilots/"))
			data = {
				enrollments:
					pending || enrolled
						? [
								{
									tx_ref: "pi-test",
									state: enrolled ? "enrolled" : "pending",
									payment_intents: {
										status: enrolled ? "credited" : "created",
										checkout_status: enrolled ? "ready" : "unknown",
										checkout_url: null,
										mismatch_reason: null,
									},
								},
							]
						: [],
				attendance: attendance
					? [{ attendance_date: "2026-09-06", approved: true, reason: "Present" }]
					: [],
				disputes: [],
				money: enrolled ? [{ id: "ledger-1", type: "stake", amount: 500, payout_jobs: [] }] : [],
			};
		else return route.fulfill({ status: 404, json: { data: null, error: `Unexpected ${path}` } });
		await route.fulfill({ json: { data, error: null } });
	});
	return {
		credit: () => {
			enrolled = true;
		},
		markAttendance: () => {
			attendance = true;
		},
	};
}
test("guest sees the full price and terms, with a preserved sign-in destination", async ({
	page,
}) => {
	await setup(page);
	await page.goto(`/pilot/${room}?source=partner`);
	await expect(page.getByText("Total upfront:")).toContainText("800 ETB");
	await expect(page.getByText("Qualify with 10 approved days")).toBeVisible();
	const link = page.getByRole("link", { name: "Sign in to join this cohort" });
	await expect(link).toHaveAttribute(
		"href",
		`/signin?next=${encodeURIComponent(`/pilot/${room}?source=partner`)}`,
	);
	await expect(page.getByText("Payment expires in")).toHaveCount(0);
});
test("Telegram participant does not see success until the backend credits payment", async ({
	page,
}) => {
	const control = await setup(page, true);
	await page.goto(`/pilot/${room}`);
	await page.getByLabel("Account name", { exact: true }).fill("Pilot Member");
	await page.getByLabel("Payout bank or wallet").selectOption("123");
	await page.getByLabel("Account number", { exact: true }).fill("0911223344");
	await page.getByRole("checkbox").check();
	await page.getByRole("button", { name: "Continue to payment" }).click();
	await expect(page.getByText("Checkout is unresolved.", { exact: false })).toBeVisible();
	await expect(page.getByText("Enrollment: enrolled", { exact: false })).toHaveCount(0);
	control.credit();
	await page.getByRole("button", { name: "Refresh payment status" }).click();
	await expect(page.getByText("Enrollment: enrolled", { exact: false })).toBeVisible();
	await page.getByRole("link", { name: "View the next cohort", exact: false }).click();
	await expect(page).toHaveURL(new RegExp(`/pilot/${next}`));
});
test("native email OTP returns to the same cohort after verification", async ({ page }) => {
	await setup(page);
	const token = [
		btoa(JSON.stringify({ alg: "HS256" })),
		btoa(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })),
		"signature",
	].join(".");
	await page.route("http://127.0.0.1:55889/**", (route) => {
		if (new URL(route.request().url()).pathname.endsWith("/verify"))
			return route.fulfill({
				json: {
					access_token: token,
					refresh_token: "refresh",
					token_type: "bearer",
					expires_in: 3600,
					user: {
						id: user.id,
						email: "member@example.test",
						user_metadata: { full_name: user.full_name },
					},
				},
			});
		return route.fulfill({ json: {} });
	});
	await page.goto(`/signin?next=${encodeURIComponent(`/pilot/${room}?source=partner`)}`);
	await page.getByRole("button", { name: "Sign in with Email" }).click();
	await page.getByLabel("Email Address").fill("member@example.test");
	await page.getByRole("button", { name: "Send Code" }).click();
	await page.getByPlaceholder("000000").fill("123456");
	await page.getByRole("button", { name: "Verify", exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`/pilot/${room}\\?source=partner`));
	await expect(page.getByLabel("Account name", { exact: true })).toBeVisible();
});
test("assigned staff can confirm current-day attendance", async ({ page }) => {
	await setup(page, true);
	await page.goto(`/pilot/${room}/staff`);
	await expect(page.getByText("Pilot Member · 0 approved days")).toBeVisible();
	await page.getByRole("button", { name: "Confirm attendance today" }).click();
	await expect(page.getByText("Attendance recorded", { exact: true })).toBeVisible();
});
