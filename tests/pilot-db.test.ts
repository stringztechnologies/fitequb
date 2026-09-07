import { execFile, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { beforeAll, describe, expect, it } from "vitest";

const database = process.env.PILOT_TEST_DATABASE_URL;
const args = [database ?? "", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"];
const environment = { ...process.env, PGOPTIONS: "-c client_min_messages=error" };
const sql = (q: string) =>
	execFileSync("psql", [...args, "-c", q], {
		encoding: "utf8",
		env: environment,
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
const query = (q: string) => JSON.parse(sql(q));
const parallelSql = async (q: string) =>
	(await promisify(execFile)("psql", [...args, "-c", q], { env: environment })).stdout.trim();
const quote = (v: string) => `'${v.replaceAll("'", "''")}'`;
function person() {
	const id = randomUUID();
	sql(`insert into users(id,full_name) values('${id}','Pilot test member')`);
	return id;
}
function cohort(capacity = 2, stake = 500) {
	const room = randomUUID();
	const gym = randomUUID();
	const admin = person();
	const staff = person();
	sql(`insert into pilot_admins values('${admin}'); insert into partner_gyms(id,name) values('${gym}','Test gym');
 insert into equb_rooms(id,name,stake_amount,start_date,end_date,duration_days,workout_target,completion_pct,min_members,max_members,house_fee_pct) values('${room}','Test cohort',${stake},date_trunc('day',now())+interval '2 days',date_trunc('day',now())+interval '32 days',30,12,0.8,${capacity},${capacity},5);
 insert into pilot_configs(room_id,gym_id,coach_id,enrollment_deadline,published,checkout_ready) select '${room}','${gym}','${staff}',start_date,true,true from equb_rooms where id='${room}';
 insert into pilot_staff values('${room}','${staff}');`);
	return { room, admin, staff, gym };
}
function prepare(room: string, user = person()) {
	const data = query(
		`select pilot_prepare_enrollment('${room}','${user}','pilot-v1','partner','123','0911223344','Test Member')`,
	);
	return {
		ref: data.tx_ref as string,
		user,
		total: Number(data.expected_amount),
		created: data.created,
	};
}
function credit(ref: string, amount = 800, currency = "ETB", status = "success") {
	return query(
		`select pilot_credit_payment(${quote(ref)},${amount},${quote(currency)},${quote(status)})`,
	);
}
function moveRoom(room: string, start: string, end: string, status = "active") {
	// Fixture-only clock movement under the disposable database owner; production APIs cannot do this.
	sql(
		`alter table equb_rooms disable trigger freeze_pilot_room; update equb_rooms set start_date=${start},end_date=${end},status='${status}' where id='${room}'; alter table equb_rooms enable trigger freeze_pilot_room;`,
	);
}
function pastRoom(room: string) {
	moveRoom(
		room,
		"date_trunc('day',now())-interval '32 days'",
		"date_trunc('day',now())-interval '2 days'",
	);
}
function qualify(room: string, user: string, count = 10) {
	sql(
		`insert into pilot_attendance(room_id,user_id,attendance_date,approved,actor_id,reason) select '${room}','${user}',(select (start_date at time zone 'Africa/Addis_Ababa')::date from equb_rooms where id='${room}')+n,true,(select coach_id from pilot_configs where room_id='${room}'),'Historical staff record' from generate_series(0,${count - 1}) n`,
	);
}

describe.skipIf(!database)("Paid pilot database behavior", () => {
	beforeAll(() => {
		if (!database || !new URL(database).pathname.endsWith("_test"))
			throw new Error("Use a disposable database ending in _test");
		sql("drop schema public cascade; create schema public;");
		for (const file of [
			"tests/db/baseline.sql",
			"supabase/migrations/20260705120000_s2_schema_reconciliation.sql",
			"supabase/migrations/20260705210000_money_correctness_launch_hardening.sql",
			"supabase/migrations/20260906120000_paid_pilot.sql",
		])
			sql(readFileSync(file, "utf8"));
	});
	it("configures real EAT boundaries and decimal prices on the reconciled v1 schema", () => {
		const c = cohort();
		const id = sql(
			`select pilot_configure('${c.admin}',null,jsonb_build_object('name','Configured cohort','gym_id','${c.gym}','coach_id','${c.staff}','start_date',(date_trunc('day',now() at time zone 'Africa/Addis_Ababa')+interval '2 days') at time zone 'Africa/Addis_Ababa','stake_amount',500.01))`,
		);
		expect(
			query(
				`select jsonb_build_object('hour',extract(hour from start_date at time zone 'Africa/Addis_Ababa'),'days',extract(epoch from end_date-start_date)/86400,'stake',stake_amount,'required',ceil(workout_target*completion_pct)) from equb_rooms where id='${id}'`,
			),
		).toEqual({ hour: 0, days: 30, stake: 500.01, required: 10 });
		expect(sql(`select checkout_ready from pilot_configs where room_id='${id}'`)).toBe("f");
	});
	it("withdrawal during pending verification quarantines a delayed paid receipt", () => {
		const c = cohort();
		const e = prepare(c.room);
		sql(`select pilot_withdraw('${c.room}','${e.user}')`);
		expect(prepare(c.room, e.user).ref).toBe(e.ref);
		expect(credit(e.ref).status).toBe("mismatch");
		expect(sql(`select count(*) from equb_members where room_id='${c.room}'`)).toBe("0");
		sql(`select pilot_refund_mismatch('${c.admin}','${e.ref}')`);
		expect(
			Number(
				sql(
					`select amount from equb_ledger where payment_intent_ref='${e.ref}' and type='payment_refund'`,
				),
			),
		).toBe(800);
	});
	it("the day beginning at 21:00 UTC counts only under its next EAT date", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		moveRoom(
			c.room,
			"date_trunc('day',now() at time zone 'Africa/Addis_Ababa') at time zone 'Africa/Addis_Ababa'",
			"now()+interval '30 days'",
		);
		expect(() =>
			sql(
				`select pilot_record_attendance('${c.staff}','${c.room}','${e.user}',(select (start_date at time zone 'UTC')::date from equb_rooms where id='${c.room}'),true,'UTC date is too early')`,
			),
		).toThrow();
		sql(
			`select pilot_record_attendance('${c.staff}','${c.room}','${e.user}',(now() at time zone 'Africa/Addis_Ababa')::date,true,'Approved in EAT')`,
		);
		expect(sql(`select completed_days from equb_members where room_id='${c.room}'`)).toBe("1");
	});
	it("reuses a pending checkout without charging twice", () => {
		const c = cohort();
		const first = prepare(c.room);
		const again = prepare(c.room, first.user);
		expect(again.ref).toBe(first.ref);
		expect(again.created).toBe(false);
	});
	it("quarantines receipts when the unpublished bargain changes before first credit", () => {
		const c = cohort();
		const e = prepare(c.room);
		sql(
			`update equb_rooms set start_date=start_date+interval '1 day',end_date=end_date+interval '1 day' where id='${c.room}'`,
		);
		expect(credit(e.ref)).toMatchObject({ status: "mismatch", reason: "offer_changed" });
	});
	it("atomically credits separate fee and stake exactly once without early activation", () => {
		const c = cohort(1);
		const e = prepare(c.room);
		expect(credit(e.ref).status).toBe("credited");
		expect(credit(e.ref).status).toBe("credited");
		expect(
			sql(
				`select string_agg(type||':'||amount,',' order by type) from equb_ledger where payment_intent_ref='${e.ref}'`,
			),
		).toBe("program_fee:300.00,stake:500.00");
		expect(sql(`select status from equb_rooms where id='${c.room}'`)).toBe("pending");
		expect(sql(`select count(*) from equb_members where room_id='${c.room}'`)).toBe("1");
	});
	it("serializes simultaneous final-seat purchases and quarantines the extra receipt", async () => {
		const c = cohort(1);
		const a = prepare(c.room);
		const b = prepare(c.room);
		const values = await Promise.all(
			[a, b].map((e) => parallelSql(`select pilot_credit_payment('${e.ref}',800,'ETB','success')`)),
		);
		expect(values.map((v) => JSON.parse(v).status).sort()).toEqual(["credited", "mismatch"]);
		expect(sql(`select count(*) from equb_members where room_id='${c.room}'`)).toBe("1");
	});
	it("rejects wrong totals and currency without a member or stake pot", () => {
		for (const [amount, currency] of [
			[799, "ETB"],
			[801, "ETB"],
			[800, "USD"],
		] as const) {
			const c = cohort();
			const e = prepare(c.room);
			expect(credit(e.ref, amount, currency).status).toBe("mismatch");
			expect(sql(`select count(*) from equb_members where room_id='${c.room}'`)).toBe("0");
		}
	});
	it("missing provider status and currency cannot allocate an enrollment", () => {
		const c = cohort();
		const e = prepare(c.room);
		expect(query(`select pilot_credit_payment('${e.ref}',800,'ETB',null)`).status).toBe("pending");
		expect(query(`select pilot_credit_payment('${e.ref}',800,null,'success')`).status).toBe(
			"mismatch",
		);
		expect(sql(`select count(*) from equb_members where room_id='${c.room}'`)).toBe("0");
	});
	it("a stale provider failure cannot undo a successful allocation", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		expect(credit(e.ref, 800, "ETB", "failed").status).toBe("credited");
		sql(`update payment_intents set status='failed' where tx_ref='${e.ref}'`);
		expect(sql(`select status from payment_intents where tx_ref='${e.ref}'`)).toBe("credited");
	});
	it("freezes paid configuration and preserves immutable ledger entries", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		expect(() => sql(`update pilot_configs set program_fee=1 where room_id='${c.room}'`)).toThrow();
		expect(() => sql(`update equb_rooms set stake_amount=1 where id='${c.room}'`)).toThrow();
		expect(() => sql(`delete from equb_ledger where payment_intent_ref='${e.ref}'`)).toThrow();
	});
	it("refunds pre-start withdrawal once and ignores subsequent webhook delivery", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		sql(
			`select pilot_withdraw('${c.room}','${e.user}');select pilot_withdraw('${c.room}','${e.user}');`,
		);
		expect(credit(e.ref).status).toBe("refund_requested");
		expect(
			sql(
				`select sum(amount) from equb_ledger where payment_intent_ref='${e.ref}' and type in ('refund','program_refund')`,
			),
		).toBe("800.00");
		expect(
			sql(
				`select count(*) from payout_jobs j join equb_ledger l on l.id=j.ledger_id where l.payment_intent_ref='${e.ref}'`,
			),
		).toBe("2");
		expect(sql(`select count(*) from equb_members where room_id='${c.room}'`)).toBe("0");
	});
	it("refund status becomes final only after both components are delivered", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		sql(`select pilot_withdraw('${c.room}','${e.user}')`);
		sql(
			`update payout_jobs set status='confirmed' where ledger_id in(select id from equb_ledger where payment_intent_ref='${e.ref}' and type='refund');select pilot_finish_refunds()`,
		);
		expect(sql(`select status from payment_intents where tx_ref='${e.ref}'`)).toBe(
			"refund_requested",
		);
		sql(
			`update payout_jobs set status='confirmed' where ledger_id in(select id from equb_ledger where payment_intent_ref='${e.ref}');select pilot_finish_refunds()`,
		);
		expect(credit(e.ref).status).toBe("refunded");
	});
	it("rejects voluntary refunds after the start", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		moveRoom(c.room, "now()-interval '1 day'", "now()+interval '29 days'");
		expect(() => sql(`select pilot_withdraw('${c.room}','${e.user}')`)).toThrow();
	});
	it("operator cancellation refunds unserved time and all stake, only once", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		moveRoom(c.room, "now()-interval '15 days'", "now()+interval '15 days'");
		sql(
			`select pilot_cancel('${c.admin}','${c.room}');select pilot_cancel('${c.admin}','${c.room}')`,
		);
		expect(
			sql(
				`select sum(amount) from equb_ledger where payment_intent_ref='${e.ref}' and type in ('refund','program_refund')`,
			),
		).toBe("650.00");
	});
	it("underfilled rooms are cancelled and fully refunded at enrollment cutoff", () => {
		const c = cohort(2);
		const e = prepare(c.room);
		credit(e.ref);
		sql(
			`alter table pilot_configs disable trigger freeze_pilot_config;update pilot_configs set enrollment_deadline=now()-interval '1 second' where room_id='${c.room}';alter table pilot_configs enable trigger freeze_pilot_config;select pilot_lifecycle();`,
		);
		expect(sql(`select status from equb_rooms where id='${c.room}'`)).toBe("cancelled");
		expect(credit(e.ref).status).toBe("refund_requested");
	});
	it("late verified receipts create no enrollment and can be refunded idempotently", () => {
		const c = cohort();
		const e = prepare(c.room);
		moveRoom(c.room, "now()-interval '1 day'", "now()+interval '29 days'", "pending");
		expect(credit(e.ref).status).toBe("mismatch");
		sql(
			`select pilot_refund_mismatch('${c.admin}','${e.ref}');select pilot_refund_mismatch('${c.admin}','${e.ref}')`,
		);
		expect(
			sql(
				`select sum(amount) from equb_ledger where payment_intent_ref='${e.ref}' and type='payment_refund'`,
			),
		).toBe("800");
	});
	it("only assigned staff can approve, and repeated confirmation counts once", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		moveRoom(
			c.room,
			"date_trunc('day',now())-interval '1 day'",
			"date_trunc('day',now())+interval '29 days'",
		);
		const today = "(now() at time zone 'Africa/Addis_Ababa')::date";
		expect(() =>
			sql(
				`select pilot_record_attendance('${e.user}','${c.room}','${e.user}',${today},true,'Present')`,
			),
		).toThrow();
		const statement = `select pilot_record_attendance('${c.staff}','${c.room}','${e.user}',${today},true,'Present')`;
		sql(`${statement};${statement}`);
		expect(
			sql(
				`select completed_days from equb_members where room_id='${c.room}' and user_id='${e.user}'`,
			),
		).toBe("1");
		expect(() =>
			sql(
				`select pilot_record_attendance('${c.staff}','${c.room}','${e.user}',${today}-1,true,'Present')`,
			),
		).toThrow();
		sql(
			`select pilot_record_attendance('${c.admin}','${c.room}','${e.user}',${today},false,'Recorded in error')`,
		);
		expect(
			sql(
				`select completed_days from equb_members where room_id='${c.room}' and user_id='${e.user}'`,
			),
		).toBe("0");
	});
	it("cannot inflate pilot credit through the legacy RPC or direct cached counter", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		expect(() => sql(`select increment_completed_days('${e.user}','${c.room}')`)).toThrow();
		sql(`update equb_members set completed_days=100 where room_id='${c.room}'`);
		expect(sql(`select completed_days from equb_members where room_id='${c.room}'`)).toBe("0");
		expect(() => sql(`select apply_stake_payment('${e.ref}',800)`)).toThrow();
	});
	it("enforces early settlement, correction windows, and unresolved disputes in SQL", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		expect(query(`select settle_equb('${c.room}')`).status).toBe("skipped");
		moveRoom(c.room, "now()-interval '30 days'", "now()-interval '1 hour'");
		expect(query(`select settle_equb('${c.room}')`).status).toBe("held");
		pastRoom(c.room);
		sql(
			`insert into pilot_disputes(room_id,user_id,attendance_date,reason) values('${c.room}','${e.user}',current_date-3,'Missing attendance')`,
		);
		expect(query(`select settle_equb('${c.room}')`).status).toBe("held");
		sql(
			`select pilot_record_attendance('${c.admin}','${c.room}','${e.user}',current_date-3,true,'Resolved with staff evidence')`,
		);
		expect(
			sql(`select count(*) from pilot_attendance where room_id='${c.room}' and approved`),
		).toBe("1");
		sql(
			`update pilot_disputes set resolved_at=now(),resolved_by='${c.admin}',resolution='Approved correction' where room_id='${c.room}'`,
		);
		expect(query(`select settle_equb('${c.room}')`).status).toBe("settled");
		expect(() =>
			sql(
				`select pilot_record_attendance('${c.admin}','${c.room}','${e.user}',current_date-3,false,'After settlement')`,
			),
		).toThrow();
	});
	it("all qualifiers recover their stakes and program fees stay out of the pot", () => {
		const c = cohort();
		const a = prepare(c.room);
		const b = prepare(c.room);
		credit(a.ref);
		credit(b.ref);
		pastRoom(c.room);
		qualify(c.room, a.user);
		qualify(c.room, b.user);
		expect(query(`select settle_equb('${c.room}')`)).toMatchObject({
			status: "settled",
			total_pot: 1000,
			house_fee: 0,
			qualified: 2,
		});
		expect(
			sql(`select sum(amount) from equb_ledger where room_id='${c.room}' and type='payout'`),
		).toBe("1000.0000000000000000");
		expect(query(`select settle_equb('${c.room}')`).status).toBe("skipped");
	});
	it("zero qualifiers recover stakes but not delivered service fees", () => {
		const c = cohort();
		const e = prepare(c.room);
		credit(e.ref);
		pastRoom(c.room);
		expect(query(`select settle_equb('${c.room}')`)).toMatchObject({ house_fee: 0, qualified: 0 });
		expect(
			Number(
				sql(`select sum(amount) from equb_ledger where room_id='${c.room}' and type='refund'`),
			),
		).toBe(500);
		expect(
			sql(`select count(*) from equb_ledger where room_id='${c.room}' and type='program_refund'`),
		).toBe("0");
	});
	it("mixed outcomes conserve every cent and charge only forfeitures", () => {
		const c = cohort(4, 100.02);
		const members = Array.from({ length: 4 }, () => prepare(c.room));
		for (const m of members) credit(m.ref, 400.02);
		pastRoom(c.room);
		for (const m of members.slice(0, 3)) qualify(c.room, m.user);
		qualify(c.room, members[3]?.user ?? "", 9);
		expect(query(`select settle_equb('${c.room}')`)).toMatchObject({
			house_fee: 5,
			total_pot: 400.08,
			qualified: 3,
		});
		expect(
			Number(
				sql(
					`select sum(amount) from equb_ledger where room_id='${c.room}' and type in ('payout','fee')`,
				),
			),
		).toBe(400.08);
		expect(
			sql(
				`select string_agg(amount::numeric(12,2)::text,',' order by amount) from equb_ledger where room_id='${c.room}' and type='payout'`,
			),
		).toBe("131.69,131.69,131.70");
		expect(
			sql(
				`select user_id::text from equb_ledger where room_id='${c.room}' and type='payout' order by amount desc,user_id limit 1`,
			),
		).toBe(
			members
				.slice(0, 3)
				.map((m) => m.user)
				.sort()[0],
		);
	});
	it("anonymous and authenticated database roles cannot invoke privileged money functions", () => {
		expect(() => sql("set role authenticated;select pilot_lifecycle()")).toThrow();
		expect(() => sql("set role anon;select * from pilot_enrollments")).toThrow();
	});
});
