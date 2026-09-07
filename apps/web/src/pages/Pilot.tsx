import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { api, publicApi } from "../lib/api.js";

interface Offer {
	room_id: string;
	program_fee: number;
	terms_version: string;
	enrollment_deadline: string;
	checkout_enabled: boolean;
	next_room_id: string | null;
	coach_name: string;
	partner_gyms: { name: string; location: string };
	equb_rooms: {
		name: string;
		status: string;
		stake_amount: number;
		start_date: string;
		end_date: string;
		workout_target: number;
		completion_pct: number;
		house_fee_pct: number;
		min_members: number;
		max_members: number;
	};
}
interface Enrollment {
	tx_ref: string;
	state: string;
	payment_intents: {
		status: string;
		checkout_status: string;
		checkout_url: string | null;
		mismatch_reason: string | null;
	};
}
interface Status {
	member: { qualified: boolean; payout_amount: number } | null;
	enrollments: Enrollment[];
	attendance: Array<{ attendance_date: string; approved: boolean; reason: string }>;
	disputes: Array<{ id: string; reason: string; resolution: string | null }>;
	money: Array<{
		id: string;
		type: string;
		amount: number;
		payout_jobs: Array<{ status: string; last_error: string | null }>;
	}>;
}
export const eatDate = () =>
	new Intl.DateTimeFormat("en-CA", {
		timeZone: "Africa/Addis_Ababa",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
const dateLabel = (s: string) =>
	new Intl.DateTimeFormat("en", { timeZone: "Africa/Addis_Ababa", dateStyle: "medium" }).format(
		new Date(s),
	);
const cutoffLabel = (s: string) =>
	new Intl.DateTimeFormat("en", {
		timeZone: "Africa/Addis_Ababa",
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(s));
export function Pilot() {
	const { roomId } = useParams();
	const { isGuest, loading: authLoading } = useAuth();
	const [offer, setOffer] = useState<Offer | null>(null);
	const [status, setStatus] = useState<Status | null>(null);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [banks, setBanks] = useState<Array<{ id: string; name: string }>>([]);
	const [accepted, setAccepted] = useState(false);
	const [bank, setBank] = useState("");
	const [account, setAccount] = useState("");
	const [name, setName] = useState("");
	const [disputeDate, setDisputeDate] = useState(eatDate());
	const [reason, setReason] = useState("");
	const refresh = useCallback(async () => {
		const result = await publicApi<Offer>(`/public/pilots/${roomId}`);
		if (result.error) setError(result.error);
		else setOffer(result.data);
		if (!isGuest) {
			const own = await api<Status>(`/api/pilots/${roomId}`);
			if (own.error) setError(own.error);
			else setStatus(own.data);
		}
	}, [roomId, isGuest]);
	useEffect(() => {
		void refresh();
	}, [refresh]);
	useEffect(() => {
		if (isGuest) return;
		api<Array<{ id: string; name: string }>>("/api/pilots/banks").then((r) => {
			if (r.data) setBanks(r.data);
			else if (r.error) setError(r.error);
		});
	}, [isGuest]);
	const pending = status?.enrollments.some(
		(e) => e.payment_intents.status === "created" || e.payment_intents.status === "paid",
	);
	useEffect(() => {
		if (!pending) return;
		const timer = setInterval(() => void refresh(), 5000);
		return () => clearInterval(timer);
	}, [pending, refresh]);
	async function enroll() {
		setBusy(true);
		setError("");
		const res = await api<{ checkout_url?: string; status: string; checkout_status: string }>(
			`/api/pilots/${roomId}/enroll`,
			{
				method: "POST",
				body: JSON.stringify({
					terms_version: offer?.terms_version,
					source: new URLSearchParams(location.search).get("source") ?? "direct",
					bank_code: bank,
					account_number: account,
					account_name: name,
				}),
			},
		);
		setBusy(false);
		if (res.error) {
			setError(res.error);
			return;
		}
		if (res.data?.checkout_url) {
			location.assign(res.data.checkout_url);
			return;
		}
		await refresh();
	}
	async function action(path: string, body: unknown = {}) {
		setBusy(true);
		setError("");
		const res = await api(`/api/pilots/${roomId}/${path}`, {
			method: "POST",
			body: JSON.stringify(body),
		});
		if (res.error) setError(res.error);
		setBusy(false);
		await refresh();
	}
	if (!offer)
		return (
			<main className="p-6">
				<h1>FitEqub pilot</h1>
				<output>{error || "Loading cohort…"}</output>
			</main>
		);
	const room = offer.equb_rooms;
	const total = Number(offer.program_fee) + Number(room.stake_amount);
	const enrolled = status?.enrollments.some((e) => e.state === "enrolled");
	const canEnroll =
		offer.checkout_enabled &&
		room.status === "pending" &&
		Date.now() < Date.parse(offer.enrollment_deadline);
	return (
		<main className="p-5 pb-28 space-y-5 text-on-surface">
			<Link to="/">FitEqub</Link>
			<h1 className="text-2xl font-bold">{room.name}</h1>
			<p>
				{offer.partner_gyms.name} · {offer.partner_gyms.location} · Coach: {offer.coach_name}
			</p>
			<p>
				{dateLabel(room.start_date)} – {dateLabel(room.end_date)} · Addis Ababa time
			</p>
			<p>
				Starts at {cutoffLabel(room.start_date)} EAT. Attendance closes at{" "}
				{cutoffLabel(room.end_date)} EAT (exclusive).
			</p>
			<p>
				Enrollment closes at {cutoffLabel(offer.enrollment_deadline)} EAT. Minimum{" "}
				{room.min_members}, maximum {room.max_members} participants. If the minimum is not reached
				at the deadline, the cohort is cancelled and both the program fee and stake are refunded.
			</p>
			<p>
				Coach follow-up, a small group, and staff-recorded attendance. Gym membership and personal
				training are not included.
			</p>
			<section
				className="rounded-xl border border-outline-variant p-4 space-y-2"
				aria-label="Price and rules"
			>
				<p>
					Program fee: <strong>{offer.program_fee} ETB</strong>
				</p>
				<p>
					At-risk stake: <strong>{room.stake_amount} ETB</strong>
				</p>
				<p>
					Total upfront: <strong>{total} ETB</strong>
				</p>
				<p>
					Qualify with {Math.ceil(room.workout_target * room.completion_pct)} approved days out of a
					target of {room.workout_target}. One attendance day per calendar day.
				</p>
				<p>
					Qualified members share the stake pot after a {room.house_fee_pct}% fee on forfeited
					stakes. If everyone qualifies, stakes return in full. If nobody qualifies, stakes are
					refunded. The program fee is separate.
				</p>
				<p>
					Withdraw before the scheduled start for a full program-fee and stake refund. After
					starting, voluntary withdrawal, including illness, does not refund the program fee; stakes
					follow attendance rules. Operator cancellation returns stakes and refunds undelivered
					service proportionally to unused scheduled time, rounded to ETB cents.
				</p>
				<p>
					Report attendance disputes by 24 hours after the program ends. Settlement waits for
					unresolved disputes. Transfer submission is not confirmation of delivery.
				</p>
			</section>
			{error && (
				<p role="alert" className="text-red-400">
					{error}
				</p>
			)}
			{!canEnroll && <output>New enrollment is not enabled.</output>}
			{isGuest && !authLoading ? (
				<Link
					className="block underline"
					to={`/signin?next=${encodeURIComponent(`/pilot/${roomId}${location.search}`)}`}
				>
					Sign in to join this cohort
				</Link>
			) : null}
			{!isGuest && !enrolled && canEnroll && (
				<form
					className="space-y-3"
					onSubmit={(e) => {
						e.preventDefault();
						void enroll();
					}}
				>
					<h2 className="text-xl">Payout details</h2>
					<label className="block">
						Account name
						<input
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="block w-full bg-surface-container p-3"
						/>
					</label>
					<label className="block">
						Payout bank or wallet
						<select
							required
							value={bank}
							onChange={(e) => setBank(e.target.value)}
							className="block w-full bg-surface-container p-3"
						>
							<option value="">Choose a bank or wallet</option>
							{banks.map((b) => (
								<option key={b.id} value={b.id}>
									{b.name}
								</option>
							))}
						</select>
					</label>
					<label className="block">
						Account number
						<input
							required
							inputMode="numeric"
							pattern="[0-9]{5,30}"
							value={account}
							onChange={(e) => setAccount(e.target.value)}
							className="block w-full bg-surface-container p-3"
						/>
					</label>
					<label className="flex gap-2">
						<input
							type="checkbox"
							checked={accepted}
							onChange={(e) => setAccepted(e.target.checked)}
						/>
						I accept the price, stake-loss and refund rules ({offer.terms_version}).
					</label>
					<button
						type="submit"
						disabled={!accepted || busy}
						className="rounded bg-primary text-on-primary p-3 disabled:opacity-50"
					>
						Continue to payment · {total} ETB
					</button>
				</form>
			)}
			{status && (
				<section className="space-y-3">
					<h2 className="text-xl">Your enrollment</h2>
					{status.enrollments.map((e) => (
						<div key={e.tx_ref}>
							<p>
								Payment: {e.payment_intents.status} · Enrollment: {e.state}
							</p>
							{e.payment_intents.checkout_status === "unknown" && (
								<p>
									Checkout is unresolved. Contact the organizer with reference {e.tx_ref}; do not
									pay again.
								</p>
							)}
							{e.payment_intents.mismatch_reason && (
								<p>Refund review: {e.payment_intents.mismatch_reason}</p>
							)}
						</div>
					))}
					<button type="button" onClick={() => void refresh()} className="underline">
						Refresh payment status
					</button>
					<p>Approved attendance: {status.attendance.filter((a) => a.approved).length} days</p>
					{status.attendance.map((a) => (
						<p key={a.attendance_date}>
							{a.attendance_date}: {a.approved ? "Approved" : "Corrected — not counted"}
						</p>
					))}
					{enrolled && room.status === "pending" && Date.now() < Date.parse(room.start_date) && (
						<button
							disabled={busy}
							type="button"
							onClick={() => void action("withdraw")}
							className="block underline"
						>
							Withdraw and request full refund
						</button>
					)}
					{enrolled && room.status === "active" && (
						<form
							className="space-y-2"
							onSubmit={(e) => {
								e.preventDefault();
								void action("disputes", { date: disputeDate, reason });
							}}
						>
							<h3>Report an attendance issue</h3>
							<label className="block">
								Attendance date
								<input
									type="date"
									value={disputeDate}
									onChange={(e) => setDisputeDate(e.target.value)}
									className="block bg-surface-container p-2"
								/>
							</label>
							<label className="block">
								What needs correcting?
								<textarea
									required
									minLength={3}
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									className="block w-full bg-surface-container p-2"
								/>
							</label>
							<button disabled={busy} className="underline" type="submit">
								Submit dispute
							</button>
						</form>
					)}
					{status.disputes.map((d) => (
						<p key={d.id}>
							{d.reason} — {d.resolution ?? "Awaiting review"}
						</p>
					))}
					<h3>Money and delivery</h3>
					{room.status === "settled" && status.member && (
						<p>
							Stake outcome:{" "}
							{status.member.qualified
								? `qualified; ${status.member.payout_amount} ETB payout`
								: Number(status.member.payout_amount) > 0
									? `${status.member.payout_amount} ETB stake return (no qualifiers)`
									: "stake forfeited under attendance rules"}
							. Delivery is shown separately below.
						</p>
					)}
					{status.money.map((m) => (
						<p key={m.id}>
							{m.type.replaceAll("_", " ")}: {m.amount} ETB{" "}
							{m.payout_jobs
								.map((j) => `· ${j.status}${j.last_error ? ` (${j.last_error})` : ""}`)
								.join(" ")}
						</p>
					))}
				</section>
			)}
			{offer.next_room_id && (
				<Link className="block underline" to={`/pilot/${offer.next_room_id}?source=renewal`}>
					View the next cohort — renewal requires a new payment
				</Link>
			)}
		</main>
	);
}
