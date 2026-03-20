import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

interface LeaderboardEntry {
	id: string;
	total_steps: number;
	users: { full_name: string; username: string | null };
}

export function Leaderboard() {
	const { id } = useParams<{ id: string }>();
	const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [steps, setSteps] = useState("");
	const [logging, setLogging] = useState(false);
	const [joined, setJoined] = useState(false);

	useEffect(() => {
		if (!id) return;
		api<LeaderboardEntry[]>(`/api/challenges/${id}/leaderboard`)
			.then((res) => {
				if (res.data) setEntries(res.data);
			})
			.finally(() => setLoading(false));
	}, [id]);

	async function handleJoin() {
		if (!id) return;
		await api(`/api/challenges/${id}/join`, { method: "POST" });
		setJoined(true);
	}

	async function handleLogSteps() {
		if (!id || !steps) return;
		setLogging(true);
		await api(`/api/challenges/${id}/log-steps`, {
			method: "POST",
			body: JSON.stringify({ steps: Number(steps) }),
		});
		setLogging(false);
		setSteps("");
		// Refresh leaderboard
		const res = await api<LeaderboardEntry[]>(`/api/challenges/${id}/leaderboard`);
		if (res.data) setEntries(res.data);
	}

	if (loading) return <Loading />;

	return (
		<div className="p-4 pb-20">
			<h1 className="text-xl font-bold text-tg-text mb-4">Leaderboard</h1>

			{!joined && (
				<button
					type="button"
					onClick={handleJoin}
					className="w-full mb-4 bg-tg-button text-tg-button-text py-2.5 rounded-xl text-sm font-medium"
				>
					Join Challenge
				</button>
			)}

			<div className="flex gap-2 mb-4">
				<input
					type="number"
					value={steps}
					onChange={(e) => setSteps(e.target.value)}
					placeholder="Enter today's steps"
					className="flex-1 bg-tg-secondary-bg text-tg-text rounded-lg px-3 py-2.5 text-sm outline-none"
				/>
				<button
					type="button"
					onClick={handleLogSteps}
					disabled={logging || !steps}
					className="bg-tg-button text-tg-button-text px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
				>
					Log
				</button>
			</div>

			{entries.length === 0 ? (
				<p className="text-tg-hint text-sm text-center mt-4">No participants yet.</p>
			) : (
				<div className="space-y-2">
					{entries.map((entry, i) => (
						<div
							key={entry.id}
							className="flex items-center gap-3 bg-tg-secondary-bg rounded-lg p-3"
						>
							<span className="text-sm font-bold text-tg-hint w-6 text-center">
								{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
							</span>
							<span className="flex-1 text-sm text-tg-text">{entry.users.full_name}</span>
							<span className="text-sm font-semibold text-tg-text">
								{entry.total_steps.toLocaleString()}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
