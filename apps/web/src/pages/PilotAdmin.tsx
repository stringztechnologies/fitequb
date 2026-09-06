import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { eatDate } from "./Pilot.js";
interface Cohort {
	room_id: string;
	published: boolean;
	checkout_ready: boolean;
	settlement_hold: boolean;
	gym_id: string;
	coach_id: string;
	program_fee: number;
	enrollment_deadline: string;
	equb_rooms: {
		name: string;
		status: string;
		start_date: string;
		duration_days: number;
		workout_target: number;
		completion_pct: number;
		stake_amount: number;
		min_members: number;
		max_members: number;
	};
}
interface Report {
	csv: string;
	metrics: Record<string, number>;
	enrollments: Array<{
		tx_ref: string;
		user_id: string;
		state: string;
		payment_intents: { status: string; mismatch_reason: string | null };
	}>;
	disputes: Array<{
		id: string;
		user_id: string;
		attendance_date: string;
		reason: string;
		resolved_at: string | null;
	}>;
	ledger: Array<{
		id: string;
		type: string;
		amount: number;
		payout_jobs: Array<{ status: string; last_error: string | null }>;
	}>;
	prospects: Array<{ id: string; label: string; source: string; stage: string }>;
	costs: Array<{
		id: string;
		description: string;
		amount: number;
		minutes: number;
		estimated: boolean;
	}>;
}
function fields(form: HTMLFormElement) {
	return Object.fromEntries(new FormData(form).entries());
}
export function PilotAdmin() {
	const [cohorts, setCohorts] = useState<Cohort[]>([]);
	const [room, setRoom] = useState("");
	const [report, setReport] = useState<Report | null>(null);
	const [message, setMessage] = useState("");
	const selected = cohorts.find((c) => c.room_id === room);
	const eatInput = (value?: string) =>
		value ? new Date(Date.parse(value) + 3 * 3600000).toISOString().slice(0, 16) : "";
	const load = useCallback(async () => {
		const r = await api<Cohort[]>("/api/pilot-admin");
		if (r.data) setCohorts(r.data);
		else setMessage(r.error ?? "Unavailable");
	}, []);
	useEffect(() => {
		void load();
	}, [load]);
	async function refresh(id = room) {
		if (!id) return;
		const r = await api<Report>(`/api/pilot-admin/${id}/report`);
		if (r.data) setReport(r.data);
		else setMessage(r.error ?? "Unavailable");
	}
	async function post(path: string, body: unknown) {
		const r = await api<{ room_id?: string }>(`/api/pilot-admin${path}`, {
			method: "POST",
			body: JSON.stringify(body),
		});
		setMessage(r.error ?? "Saved");
		if (r.data?.room_id) setRoom(r.data.room_id);
		await load();
		await refresh(r.data?.room_id ?? room);
	}
	const input = (name: string, label: string, type = "text", value?: string) => (
		<label className="block" key={name}>
			{label}
			<input
				required
				name={name}
				type={type}
				step={type === "number" ? "0.01" : undefined}
				defaultValue={value}
				className="block bg-surface-container p-2 w-full"
			/>
		</label>
	);
	return (
		<main className="p-5 pb-28 space-y-5">
			<h1 className="text-2xl">Pilot operations</h1>
			<Link to="/signin?next=%2Fpilot-admin">Sign in as operator</Link>
			<output>{message}</output>
			<details>
				<summary>{room ? "Edit selected draft cohort" : "Create cohort"}</summary>
				<form
					key={room}
					className="space-y-2"
					onSubmit={(e) => {
						e.preventDefault();
						const f = fields(e.currentTarget);
						void post("", {
							room_id: room || undefined,
							config: {
								name: f.name,
								gym_id: f.gym_id,
								coach_id: f.coach_id,
								start_date: `${f.start}T00:00:00+03:00`,
								program_fee: Number(f.program_fee),
								stake_amount: Number(f.stake_amount),
								duration_days: Number(f.duration_days),
								workout_target: Number(f.workout_target),
								completion_pct: Number(f.completion_pct) / 100,
								min_members: Number(f.min_members),
								max_members: Number(f.max_members),
								enrollment_deadline: f.deadline ? `${f.deadline}:00+03:00` : undefined,
							},
						});
					}}
				>
					{input("name", "Cohort name", "text", selected?.equb_rooms.name)}
					{input("gym_id", "Partner gym ID", "text", selected?.gym_id)}
					{input("coach_id", "Coach user ID", "text", selected?.coach_id)}
					{input(
						"start",
						"Start date (midnight Addis Ababa)",
						"date",
						eatInput(selected?.equb_rooms.start_date).slice(0, 10),
					)}
					{input("program_fee", "Program fee ETB", "number", String(selected?.program_fee ?? 300))}
					{input(
						"stake_amount",
						"Stake ETB",
						"number",
						String(selected?.equb_rooms.stake_amount ?? 500),
					)}
					{input(
						"duration_days",
						"Program days",
						"number",
						String(selected?.equb_rooms.duration_days ?? 30),
					)}
					{input(
						"workout_target",
						"Target attendance days",
						"number",
						String(selected?.equb_rooms.workout_target ?? 12),
					)}
					{input(
						"completion_pct",
						"Qualification percent (rounded up to whole days)",
						"number",
						String((selected?.equb_rooms.completion_pct ?? 0.8) * 100),
					)}
					{input(
						"min_members",
						"Minimum members",
						"number",
						String(selected?.equb_rooms.min_members ?? 20),
					)}
					{input(
						"max_members",
						"Maximum members",
						"number",
						String(selected?.equb_rooms.max_members ?? 20),
					)}
					<label className="block">
						Enrollment deadline (Addis Ababa; blank means start)
						<input
							className="block bg-surface-container p-2 w-full"
							type="datetime-local"
							name="deadline"
							defaultValue={eatInput(selected?.enrollment_deadline)}
						/>
					</label>
					<p>
						Terms: pilot-v1. Price, dates and rules freeze after the first payment. Select “New
						cohort” below to create a replacement.
					</p>
					<button type="submit" className="underline">
						{room ? "Save draft configuration" : "Create draft cohort"}
					</button>
				</form>
			</details>
			<label className="block">
				Cohort
				<select
					className="block bg-surface-container p-3 w-full"
					value={room}
					onChange={(e) => {
						setRoom(e.target.value);
						void refresh(e.target.value);
					}}
				>
					<option value="">New cohort</option>
					{cohorts.map((c) => (
						<option key={c.room_id} value={c.room_id}>
							{c.equb_rooms.name} · {c.equb_rooms.status}
						</option>
					))}
				</select>
			</label>
			{room && (
				<>
					<Link className="block underline" to={`/pilot/${room}`}>
						Participant offer
					</Link>
					<Link className="block underline" to={`/pilot/${room}/staff`}>
						Staff attendance
					</Link>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							const f = fields(e.currentTarget);
							void post(`/${room}/staff`, { user_id: f.user_id, remove: f.remove === "on" });
						}}
					>
						{input("user_id", "Assign staff user ID")}
						<label>
							<input name="remove" type="checkbox" /> Remove access
						</label>
						<button className="block underline" type="submit">
							Save staff access
						</button>
					</form>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							const f = fields(e.currentTarget);
							void post(`/${room}/settings`, {
								published: f.published === "on",
								checkout_ready: f.ready === "on",
								settlement_hold: f.hold === "on",
							});
						}}
					>
						<label className="block">
							<input
								key={`${room}-published-${selected?.published}`}
								defaultChecked={selected?.published}
								name="published"
								type="checkbox"
							/>{" "}
							Publish offer
						</label>
						<label className="block">
							<input
								key={`${room}-ready-${selected?.checkout_ready}`}
								defaultChecked={selected?.checkout_ready}
								name="ready"
								type="checkbox"
							/>{" "}
							Partner, terms, merchant acceptance and refund funding confirmed
						</label>
						<label className="block">
							<input
								key={`${room}-hold-${selected?.settlement_hold}`}
								defaultChecked={selected?.settlement_hold}
								name="hold"
								type="checkbox"
							/>{" "}
							Hold settlement
						</label>
						<p>
							Server checkout enablement is also required. Saving unchecked options disables them.
						</p>
						<button className="underline" type="submit">
							Save readiness
						</button>
					</form>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							void post(`/${room}/settings`, { next_room_id: fields(e.currentTarget).next });
						}}
					>
						{input("next", "Next cohort ID for renewal")}
						<button className="underline" type="submit">
							Link renewal cohort
						</button>
					</form>
					<details>
						<summary>Correct attendance</summary>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								const f = fields(e.currentTarget);
								void api(`/api/pilots/${room}/attendance`, {
									method: "POST",
									body: JSON.stringify({
										user_id: f.user_id,
										date: f.date,
										approved: f.approved === "on",
										reason: f.reason,
									}),
								}).then((r) => {
									setMessage(r.error ?? "Corrected");
									void refresh();
								});
							}}
						>
							{input("user_id", "Member ID")}
							{input("date", "Attendance date", "date", eatDate())}
							{input("reason", "Correction reason")}
							<label>
								<input type="checkbox" name="approved" /> Count this day
							</label>
							<button className="block underline" type="submit">
								Record correction
							</button>
						</form>
					</details>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							const f = fields(e.currentTarget);
							void post(`/${room}/prospects`, {
								label: f.label,
								source: f.source,
								stage: f.stage,
								note: f.note,
								user_id: f.user_id || null,
							});
						}}
					>
						<h2>Prospect / offer record</h2>
						{input("label", "Prospect label (minimal personal data)")}
						{input("source", "Introduction source")}
						<label className="block">
							Stage
							<select className="bg-surface-container p-2" name="stage">
								<option>introduced</option>
								<option>offered</option>
								<option>declined</option>
								<option>renewal_offered</option>
							</select>
						</label>
						{input("note", "Note")}
						<label className="block">
							Member user ID (optional, links renewal offers)
							<input name="user_id" className="block bg-surface-container p-2 w-full" />
						</label>
						<button className="underline" type="submit">
							Record prospect
						</button>
					</form>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							const f = fields(e.currentTarget);
							void post(`/${room}/costs`, {
								description: f.description,
								amount: Number(f.amount),
								minutes: Number(f.minutes),
								estimated: f.estimated === "on",
							});
						}}
					>
						<h2>Costs and operating time</h2>
						{input("description", "Description")}
						{input("amount", "Amount ETB", "number", "0")}
						{input("minutes", "Minutes", "number", "0")}
						<label>
							<input name="estimated" type="checkbox" /> Estimate, not actual
						</label>
						<button className="block underline" type="submit">
							Record cost / time
						</button>
					</form>
					<button type="button" className="underline" onClick={() => void post("/reconcile", {})}>
						Verify pending transfers
					</button>
					<details>
						<summary>Cancel this cohort</summary>
						<p>
							Returns stakes and refunds undelivered service. This creates real financial
							obligations.
						</p>
						<button
							type="button"
							className="underline text-red-400"
							onClick={() => {
								if (window.confirm("Cancel this cohort and create refund obligations?"))
									void post(`/${room}/cancel`, {});
							}}
						>
							Confirm operator cancellation
						</button>
					</details>
				</>
			)}
			{report && (
				<>
					<h2 className="text-xl">Cohort report</h2>
					<p>
						Contribution is only as complete as the recorded costs. Record provider charges and
						coach compensation.
					</p>
					<dl>
						{Object.entries(report.metrics).map(([k, v]) => (
							<div key={k}>
								<dt className="inline">{k.replaceAll("_", " ")}: </dt>
								<dd className="inline">{v}</dd>
							</div>
						))}
					</dl>
					<button
						type="button"
						className="underline"
						onClick={() => {
							const u = URL.createObjectURL(new Blob([report.csv], { type: "text/csv" }));
							const a = document.createElement("a");
							a.href = u;
							a.download = "pilot-cohort.csv";
							a.click();
							URL.revokeObjectURL(u);
						}}
					>
						Export roster CSV
					</button>
					<h3>Enrollments and refund review</h3>
					{report.enrollments.map((e) => (
						<div key={e.tx_ref} className="border p-2">
							<p>
								{e.user_id} · {e.state} · {e.payment_intents.status}
							</p>
							{e.payment_intents.mismatch_reason && <p>{e.payment_intents.mismatch_reason}</p>}
							{["created", "paid"].includes(e.payment_intents.status) && (
								<button
									className="underline"
									type="button"
									onClick={() => void post("/receipts/reconcile", { tx_ref: e.tx_ref })}
								>
									Verify receipt with provider
								</button>
							)}
							{e.payment_intents.status === "mismatch" && (
								<button
									type="button"
									className="underline"
									onClick={() => void post("/refund", { tx_ref: e.tx_ref })}
								>
									Request unapplied payment refund
								</button>
							)}
						</div>
					))}
					<h3>Disputes</h3>
					{report.disputes.map((d) => (
						<div key={d.id}>
							<p>
								{d.user_id} · {d.attendance_date} · {d.reason}
							</p>
							{!d.resolved_at && (
								<form
									onSubmit={(e) => {
										e.preventDefault();
										void post(`/${room}/disputes/${d.id}/resolve`, {
											resolution: fields(e.currentTarget).resolution,
										});
									}}
								>
									{input("resolution", "Resolution (correct attendance separately)")}
									<button type="submit" className="underline">
										Resolve dispute
									</button>
								</form>
							)}
						</div>
					))}
					<h3>Money obligations</h3>
					{report.ledger.map((l) => (
						<p key={l.id}>
							{l.type}: {l.amount} ETB{" "}
							{l.payout_jobs.map((j) => `${j.status}: ${j.last_error ?? ""}`).join(" · ")}
						</p>
					))}
					<h3>Prospect activity</h3>
					{report.prospects.map((p) => (
						<p key={p.id}>
							{p.label} · {p.source} · {p.stage}
						</p>
					))}
					<h3>Recorded costs</h3>
					{report.costs.map((c) => (
						<p key={c.id}>
							{c.description}: {c.amount} ETB · {c.minutes} minutes ·{" "}
							{c.estimated ? "estimate" : "actual"}
						</p>
					))}
				</>
			)}
		</main>
	);
}
