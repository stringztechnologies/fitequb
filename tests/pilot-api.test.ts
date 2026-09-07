import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const database = process.env.PILOT_TEST_DATABASE_URL;
const rest = process.env.PILOT_TEST_REST_URL;
const sql = (q: string) =>
	execFileSync("psql", [database ?? "", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", q], {
		encoding: "utf8",
		env: { ...process.env, PGOPTIONS: "-c client_min_messages=error" },
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
const secret = "pilot-test-secret-at-least-thirty-two-characters";
const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
const payload = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role: "service_role", exp: Math.floor(Date.now() / 1000) + 3600 })}`;
const serviceKey = `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
const nativeFetch = globalThis.fetch;
const verified = new Map<string, { amount: number; currency: string; status: string }>();
let transferState = "pending";
let transferCalls = 0;
let initializeCalls = 0;
let ambiguousTransfer = false;
let ambiguousCheckout = false;
let databaseAvailable = true;
let renewalRoom = "";
let verifyHook: ((reference: string) => Promise<Response | null>) | null = null;
let app: typeof import("../apps/api/src/index.js").default;
const admin = randomUUID();
const member = randomUUID();
const webUid = randomUUID();
const staff = randomUUID();
const room = randomUUID();
const paidRoom = randomUUID();
const gym = randomUUID();
function tma(id: number) {
	const values = new URLSearchParams({
		auth_date: String(Math.floor(Date.now() / 1000)),
		user: JSON.stringify({ id, first_name: "Pilot tester" }),
	});
	const data = [...values.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`)
		.join("\n");
	const key = createHmac("sha256", "WebAppData").update("pilot-test-bot").digest();
	values.set("hash", createHmac("sha256", key).update(data).digest("hex"));
	return `tma ${values}`;
}
async function request(path: string, body?: unknown, auth = tma(101)) {
	return app.request(`http://localhost${path}`, {
		method: body === undefined ? "GET" : "POST",
		headers: { authorization: auth, "content-type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

describe.skipIf(!database || !rest)("Pilot API with real PostgreSQL and PostgREST", () => {
	beforeAll(async () => {
		if (!database || !new URL(database).pathname.endsWith("_test"))
			throw new Error("Disposable _test database required");
		sql("drop schema public cascade;create schema public;");
		for (const file of [
			"tests/db/baseline.sql",
			"supabase/migrations/20260705120000_s2_schema_reconciliation.sql",
			"supabase/migrations/20260705210000_money_correctness_launch_hardening.sql",
			"supabase/migrations/20260906120000_paid_pilot.sql",
		])
			sql(readFileSync(file, "utf8"));
		sql(`grant usage on schema public to service_role; insert into users(id,full_name,telegram_id,supabase_uid) values('${admin}','Operator',100,null),('${member}','Member',101,'${webUid}'),('${staff}','Staff',102,null);insert into pilot_admins values('${admin}');insert into partner_gyms(id,name) values('${gym}','Pilot gym');
  insert into equb_rooms(id,name,stake_amount,start_date,end_date,duration_days,workout_target,completion_pct,min_members,max_members) values('${room}','API pilot',500,now()+interval '2 days',now()+interval '32 days',30,12,0.8,2,2);
  insert into equb_rooms(id,name,stake_amount,start_date,end_date,duration_days,workout_target,completion_pct,min_members,max_members) values('${paidRoom}','Paid room',500,now()+interval '2 days',now()+interval '32 days',30,12,0.8,2,2);
  insert into pilot_configs(room_id,gym_id,coach_id,enrollment_deadline,published,checkout_ready) select '${room}','${gym}','${staff}',start_date,true,true from equb_rooms where id='${room}';insert into pilot_staff values('${room}','${staff}');notify pgrst,'reload schema';`);
		process.env.SUPABASE_URL = rest;
		process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
		process.env.TELEGRAM_BOT_TOKEN = "pilot-test-bot";
		process.env.ADMIN_TELEGRAM_ID = "100";
		process.env.CHAPA_SECRET_KEY = "test-only";
		process.env.QR_SECRET = "test-qr-only";
		process.env.CHAPA_WEBHOOK_SECRET = "pilot-hook";
		process.env.PAYMENTS_ENABLED = "false";
		process.env.PILOT_CHECKOUT_ENABLED = "false";
		process.env.API_URL = "http://localhost:3000";
		process.env.TELEGRAM_MINI_APP_URL = "http://localhost:5173";
		vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
			const req = new Request(input, init);
			const url = new URL(req.url);
			if (url.href.startsWith(`${rest}/rest/v1/`)) {
				if (!databaseAvailable)
					return Response.json({ message: "database unavailable" }, { status: 503 });
				return nativeFetch(new Request(url.href.replace("/rest/v1/", "/"), req));
			}
			if (url.pathname === "/auth/v1/user")
				return Response.json({
					id: webUid,
					email: "pilot@example.test",
					user_metadata: { full_name: "Member" },
				});
			if (url.hostname !== "api.chapa.co") return nativeFetch(input, init);
			if (url.pathname === "/v1/banks")
				return Response.json({ status: "success", data: [{ id: 123, name: "Telebirr" }] });
			if (url.pathname.endsWith("/transaction/initialize")) {
				initializeCalls++;
				if (ambiguousCheckout) throw new Error("timeout");
				return Response.json({
					status: "success",
					data: { checkout_url: "https://checkout.chapa.co/test" },
				});
			}
			if (url.pathname.includes("/transaction/verify/")) {
				const ref = url.pathname.split("/").at(-1) ?? "";
				const value = verified.get(ref);
				return value
					? Response.json({ status: "success", data: { tx_ref: ref, ...value } })
					: Response.json({ status: "error" }, { status: 404 });
			}
			if (url.pathname === "/v1/transfers") {
				transferCalls++;
				if (ambiguousTransfer) throw new Error("timeout");
				return Response.json({ status: "success" });
			}
			if (url.pathname.includes("/transfers/verify/")) {
				const intercepted = await verifyHook?.(url.pathname.split("/").at(-1) ?? "");
				if (intercepted) return intercepted;
				return Response.json(
					transferState === "unparseable"
						? { status: "success" }
						: {
								status: "success",
								data: { status: transferState, reference: url.pathname.split("/").at(-1) },
							},
				);
			}
			throw new Error(`Unexpected provider path ${url.pathname}`);
		});
		app = (await import("../apps/api/src/index.js")).default;
		for (let attempt = 0; attempt < 30; attempt++) {
			const ready = await nativeFetch(`${rest}/pilot_configs?select=room_id`, {
				headers: { Authorization: `Bearer ${serviceKey}` },
			});
			if (ready.ok) break;
			if (attempt === 29) throw new Error(`PostgREST unavailable: ${await ready.text()}`);
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	});
	afterAll(() => vi.unstubAllGlobals());
	it("public offer exposes price but no private enrollment data", async () => {
		const response = await request(`/public/pilots/${room}`);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.data.program_fee).toBe(300);
		expect(body.data.coach_name).toBe("Staff");
		expect(body.data.enrollments).toBeUndefined();
	});
	it("refuses checkout while the server switch is disabled", async () => {
		const before = initializeCalls;
		for (const path of [
			`/api/pilots/${room}/enroll`,
			`/api/equb-rooms/${paidRoom}/join`,
			"/api/gyms/day-passes",
			"/api/coach-passes/purchase",
		]) {
			const response = await request(path, {});
			expect(response.status).toBe(503);
			expect(await response.json()).toEqual({
				data: null,
				error: "Payments are temporarily unavailable",
			});
		}
		expect(initializeCalls).toBe(before);
	});
	it("requires both switches for pilot checkout", async () => {
		process.env.PAYMENTS_ENABLED = "true";
		const before = initializeCalls;
		const response = await request(`/api/pilots/${room}/enroll`, {});
		expect(response.status).toBe(503);
		expect(initializeCalls).toBe(before);
	});
	it("reports database readiness and recovers without restarting", async () => {
		let response = await app.request("http://localhost/health/ready");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ data: { status: "ready" }, error: null });
		databaseAvailable = false;
		response = await app.request("http://localhost/health/ready");
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ data: null, error: "Service unavailable" });
		databaseAvailable = true;
		response = await app.request("http://localhost/health/ready");
		expect(response.status).toBe(200);
	});
	it("accepts a combined server-priced checkout and reuses it", async () => {
		process.env.PAYMENTS_ENABLED = "true";
		process.env.PILOT_CHECKOUT_ENABLED = "true";
		const input = {
			terms_version: "pilot-v1",
			bank_code: "123",
			account_number: "0911223344",
			account_name: "Member",
			program_fee: 1,
			source: "\t=1+1",
		};
		const first = await request(`/api/pilots/${room}/enroll`, input);
		expect(first.status).toBe(200);
		const a = await first.json();
		expect(a.data.expected_amount).toBe(800);
		const second = await request(`/api/pilots/${room}/enroll`, input);
		const b = await second.json();
		expect(b.data.tx_ref).toBe(a.data.tx_ref);
		verified.set(a.data.tx_ref, { amount: 800, currency: "ETB", status: "success" });
	});
	it("native web JWT resolves the same internal member and recovers pending payment", async () => {
		const response = await request(`/api/pilots/${room}`, undefined, "Bearer web-test-token");
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.data.enrollments[0].payment_intents.status).toBe("credited");
		expect(body.data.money).toHaveLength(2);
	});
	it("stale failure webhook cannot undo enrollment and invalid signatures are refused", async () => {
		const [ref] = verified.keys();
		const body = JSON.stringify({ tx_ref: ref, status: "failed" });
		const headers = {
			"content-type": "application/json",
			"x-chapa-signature": createHmac("sha256", "pilot-hook").update(body).digest("hex"),
		};
		expect(
			(await app.request("http://localhost/webhooks/chapa", { method: "POST", headers, body }))
				.status,
		).toBe(200);
		expect(
			(await app.request("http://localhost/webhooks/chapa", { method: "POST", body })).status,
		).toBe(401);
		const own = await (await request(`/api/pilots/${room}`)).json();
		expect(own.data.enrollments[0].state).toBe("enrolled");
	});
	it("legacy join and workout endpoints cannot bypass pilot rules", async () => {
		expect((await request(`/api/equb-rooms/${room}/join`, {})).status).toBe(409);
		expect((await request("/api/workouts", { room_id: room, type: "qr_checkin" })).status).toBe(
			403,
		);
	});
	it("staff can see assigned roster but members cannot impersonate staff or operator", async () => {
		expect((await request(`/api/pilots/${room}/staff`)).status).toBe(403);
		const roster = await request(`/api/pilots/${room}/staff`, undefined, tma(102));
		expect(roster.status).toBe(200);
		const body = await roster.json();
		expect(body.data[0].users.full_name).toBe("Member");
		expect(body.data[0].account_number).toBeUndefined();
		expect((await request("/api/pilot-admin")).status).toBe(403);
	});
	it("operator reports actual fee collections and exports a cohort roster", async () => {
		const report = await request(`/api/pilot-admin/${room}/report`, undefined, tma(100));
		expect(report.status).toBe(200);
		const body = await report.json();
		expect(body.data.metrics.program_collected).toBe(300);
		expect(body.data.metrics.stakes).toBe(500);
		const csv = await request(`/api/pilot-admin/${room}/report?format=csv`, undefined, tma(100));
		expect(csv.headers.get("content-type")).toContain("text/csv");
		const csvText = await csv.text();
		expect(csvText).toContain(member);
		expect(csvText).toContain("'\t=1+1");
	});
	it("counts native-auth renewal only after a separate comparable fee is credited", async () => {
		const start = `${new Date(Date.now() + 35 * 86400000).toISOString().slice(0, 10)}T00:00:00+03:00`;
		const created = await request(
			"/api/pilot-admin",
			{ config: { name: "Paid renewal", gym_id: gym, coach_id: staff, start_date: start } },
			tma(100),
		);
		expect(created.status).toBe(200);
		const next = (await created.json()).data.room_id;
		renewalRoom = next;
		expect(
			(await request(`/api/pilot-admin/${next}/staff`, { user_id: staff }, tma(100))).status,
		).toBe(200);
		expect(
			(
				await request(
					`/api/pilot-admin/${next}/settings`,
					{ published: true, checkout_ready: true },
					tma(100),
				)
			).status,
		).toBe(200);
		expect(
			(await request(`/api/pilot-admin/${room}/settings`, { next_room_id: next }, tma(100))).status,
		).toBe(200);
		const checkout = await request(
			`/api/pilots/${next}/enroll`,
			{
				terms_version: "pilot-v1",
				bank_code: "123",
				account_number: "0911223344",
				account_name: "Member",
				source: "renewal",
			},
			"Bearer web-test-token",
		);
		expect(checkout.status).toBe(200);
		const ref = (await checkout.json()).data.tx_ref;
		let report = await (
			await request(`/api/pilot-admin/${room}/report`, undefined, tma(100))
		).json();
		expect(report.data.metrics.paid_renewals).toBe(0);
		verified.set(ref, { amount: 800, currency: "ETB", status: "success" });
		const status = await (
			await request(`/api/pilots/${next}`, undefined, "Bearer web-test-token")
		).json();
		expect(status.data.enrollments[0].payment_intents.status).toBe("credited");
		report = await (await request(`/api/pilot-admin/${room}/report`, undefined, tma(100))).json();
		expect(report.data.metrics).toMatchObject({ fee_payers: 1, paid_renewals: 1 });
	});
	it("withdrawal creates refunds; ambiguous transfers never get resent", async () => {
		const response = await request(`/api/pilots/${room}/withdraw`, {});
		expect(response.status).toBe(200);
		const { processPilotPayouts, reconcilePayouts } = await import(
			"../apps/api/src/lib/pilot-payouts.js"
		);
		ambiguousTransfer = true;
		await processPilotPayouts();
		expect(transferCalls).toBe(2);
		await processPilotPayouts();
		expect(transferCalls).toBe(2);
		transferState = "unparseable";
		await processPilotPayouts();
		expect(transferCalls).toBe(2);
		transferState = "failed";
		ambiguousTransfer = false;
		await processPilotPayouts();
		expect(transferCalls).toBe(4);
		transferState = "pending approval";
		await processPilotPayouts();
		expect(transferCalls).toBe(4);
		transferState = "success";
		await reconcilePayouts();
		const own = await (await request(`/api/pilots/${room}`)).json();
		expect(own.data.enrollments[0].payment_intents.status).toBe("refunded");
		const report = await (
			await request(`/api/pilot-admin/${room}/report`, undefined, tma(100))
		).json();
		expect(report.data.metrics).toMatchObject({
			fee_payers: 0,
			paid_renewals: 0,
			transfers_outstanding: 0,
			transfers_delivered: 800,
		});
		await processPilotPayouts();
		expect(transferCalls).toBe(4);
	});
	it("ambiguous initialization preserves a single unresolved attempt", async () => {
		ambiguousCheckout = true;
		const r = await request(
			`/api/pilots/${room}/enroll`,
			{
				terms_version: "pilot-v1",
				bank_code: "123",
				account_number: "0911223344",
				account_name: "Member",
			},
			tma(102),
		);
		expect(r.status).toBe(202);
		const again = await request(
			`/api/pilots/${room}/enroll`,
			{
				terms_version: "pilot-v1",
				bank_code: "123",
				account_number: "0911223344",
				account_name: "Member",
			},
			tma(102),
		);
		expect(again.status).toBe(200);
		expect((await again.json()).data.checkout_status).toBe("unknown");
	});
	it("revoking operator configuration removes historical attendance privileges for assigned staff", async () => {
		const before = JSON.parse(
			sql(`select row_to_json(r) from equb_rooms r where id='${renewalRoom}'`),
		);
		sql(
			`insert into pilot_staff values('${renewalRoom}','${admin}');alter table equb_rooms disable trigger freeze_pilot_room; update equb_rooms set status='active',start_date=now()-interval '5 days',end_date=now()+interval '25 days' where id='${renewalRoom}';alter table equb_rooms enable trigger freeze_pilot_room;`,
		);
		process.env.ADMIN_TELEGRAM_ID = "999";
		try {
			expect((await request(`/api/pilots/${renewalRoom}/staff`, undefined, tma(100))).status).toBe(
				200,
			);
			expect(sql(`select pilot_is_admin('${admin}')`)).toBe("f");
			const response = await request(
				`/api/pilots/${renewalRoom}/attendance`,
				{
					user_id: member,
					date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
					approved: false,
					reason: "Former operator correction",
				},
				tma(100),
			);
			expect(response.status).not.toBe(200);
		} finally {
			process.env.ADMIN_TELEGRAM_ID = "100";
			sql(
				`alter table equb_rooms disable trigger freeze_pilot_room;update equb_rooms set start_date='${before.start_date}',end_date='${before.end_date}',status='pending' where id='${renewalRoom}';alter table equb_rooms enable trigger freeze_pilot_room;`,
			);
		}
	});
	it("a delayed failure for attempt one cannot make attempt two retryable", async () => {
		expect(
			(await request(`/api/pilots/${renewalRoom}/withdraw`, {}, "Bearer web-test-token")).status,
		).toBe(200);
		const { processPilotPayouts, reconcilePayouts } = await import(
			"../apps/api/src/lib/pilot-payouts.js"
		);
		transferState = "pending";
		ambiguousTransfer = false;
		await processPilotPayouts();
		const job = JSON.parse(
			sql(
				`select row_to_json(j) from payout_jobs j join equb_ledger l on l.id=j.ledger_id where l.room_id='${renewalRoom}' order by j.id limit 1`,
			),
		);
		let release: () => void = () => {};
		let entered: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const reached = new Promise<void>((resolve) => {
			entered = resolve;
		});
		let first = true;
		verifyHook = async (reference) => {
			if (reference !== job.provider_reference) return null;
			if (first) {
				first = false;
				entered();
				await gate;
			}
			return Response.json({ status: "success", data: { reference, status: "failed" } });
		};
		const stale = reconcilePayouts();
		try {
			await reached;
			await processPilotPayouts();
			expect(sql(`select attempts||':'||status from payout_jobs where id='${job.id}'`)).toBe(
				"2:sent",
			);
			release();
			await stale;
			expect(sql(`select attempts||':'||status from payout_jobs where id='${job.id}'`)).toBe(
				"2:sent",
			);
			expect(sql(`select provider_reference from payout_jobs where id='${job.id}'`)).toBe(
				`${job.reference}-a2`,
			);
			const calls = transferCalls;
			await processPilotPayouts();
			expect(transferCalls).toBe(calls);
		} finally {
			release();
			verifyHook = null;
			await stale;
		}
	});
});
