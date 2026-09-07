import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { eatDate } from "./Pilot.js";
interface Member {
	user_id: string;
	completed_days: number;
	users: { full_name: string };
}
export function PilotStaff() {
	const { loading: authLoading, isGuest } = useAuth();
	const { roomId } = useParams();
	const [members, setMembers] = useState<Member[]>([]);
	const [message, setMessage] = useState("");
	const refresh = useCallback(async () => {
		await api<Member[]>(`/api/pilots/${roomId}/staff`).then((r) => {
			if (r.data) setMembers(r.data);
			else setMessage(r.error ?? "Unavailable");
		});
	}, [roomId]);
	useEffect(() => {
		if (!authLoading && !isGuest) void refresh();
	}, [authLoading, isGuest, refresh]);
	async function confirm(id: string) {
		const r = await api(`/api/pilots/${roomId}/attendance`, {
			method: "POST",
			body: JSON.stringify({
				user_id: id,
				date: eatDate(),
				approved: true,
				reason: "Staff confirmed gym attendance",
			}),
		});
		setMessage(r.error ?? "Attendance recorded");
		if (!r.error) await refresh();
	}
	return (
		<main className="p-5 pb-24 space-y-4">
			<h1 className="text-2xl">Pilot attendance</h1>
			<Link to={`/signin?next=${encodeURIComponent(`/pilot/${roomId}/staff`)}`}>
				Sign in as assigned staff
			</Link>
			<p>
				Confirm only members you have seen attend today ({eatDate()}, Addis Ababa). Corrections go
				to the operator.
			</p>
			<output>{message}</output>
			{members.map((m) => (
				<div key={m.user_id} className="border p-3 rounded">
					<p>
						{m.users.full_name} · {m.completed_days} approved days
					</p>
					<button type="button" className="underline" onClick={() => void confirm(m.user_id)}>
						Confirm attendance today
					</button>
				</div>
			))}
		</main>
	);
}
