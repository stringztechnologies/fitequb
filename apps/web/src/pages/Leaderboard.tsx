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
		const res = await api<LeaderboardEntry[]>(`/api/challenges/${id}/leaderboard`);
		if (res.data) setEntries(res.data);
	}

	if (loading) return <Loading />;

	const top3 = entries.slice(0, 3);
	const rest = entries.slice(3);
	const prizePool = entries.reduce((sum, e) => sum + e.total_steps, 0);

	return (
		<div className="px-4 pt-5 pb-24">
			<h1 className="text-center text-lg font-bold text-white mb-1">Step Challenge Leaderboard</h1>

			{/* Prize Pool */}
			<div className="text-center mb-5">
				<p className="text-[10px] text-[#8E8E93] uppercase tracking-widest">Current Prize Pool</p>
				<p className="text-2xl font-bold text-[#FFD700]">{prizePool.toLocaleString()} ETB</p>
			</div>

			{/* Podium */}
			{top3.length >= 3 && top3[0] && top3[1] && top3[2] && (
				<div className="flex items-end justify-center gap-2 mb-6">
					{/* 2nd Place */}
					<PodiumItem entry={top3[1]} rank={2} height="h-20" ringColor="border-tg-hint" />
					{/* 1st Place */}
					<PodiumItem entry={top3[0]} rank={1} height="h-28" ringColor="border-brand-gold" crown />
					{/* 3rd Place */}
					<PodiumItem
						entry={top3[2]}
						rank={3}
						height="h-16"
						ringColor="border-[rgba(0,200,83,0.3)]"
					/>
				</div>
			)}

			{/* Join / Log */}
			{!joined && (
				<button
					type="button"
					onClick={handleJoin}
					className="w-full mb-3 bg-[#00C853] text-black py-3 rounded-[16px] text-sm font-bold shadow-[0_0_20px_rgba(0,200,83,0.2)] active:scale-[0.98] transition-transform"
				>
					Join Challenge
				</button>
			)}

			<div className="flex gap-2 mb-5">
				<input
					type="number"
					value={steps}
					onChange={(e) => setSteps(e.target.value)}
					placeholder="Enter today's steps"
					className="flex-1 bg-[#1c1c1e] border border-[#2c2c2e] text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors placeholder:text-[#8E8E93]/50"
				/>
				<button
					type="button"
					onClick={handleLogSteps}
					disabled={logging || !steps}
					className="bg-[#00C853] text-black px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-30 shadow-[0_0_20px_rgba(0,200,83,0.2)]"
				>
					{logging ? "..." : "Update"}
				</button>
			</div>

			{/* Ranked List */}
			{rest.length > 0 && (
				<div className="space-y-2">
					{rest.map((entry, i) => (
						<div
							key={entry.id}
							className="flex items-center gap-3 bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl px-4 py-3"
						>
							<span className="text-sm font-bold text-[#8E8E93] w-6 text-center">{i + 4}</span>
							<div className="w-8 h-8 rounded-full bg-[rgba(0,200,83,0.1)] flex items-center justify-center text-[#00C853] text-xs font-bold">
								{entry.users.full_name.charAt(0)}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm text-white font-medium truncate">{entry.users.full_name}</p>
								<p className="text-xs text-[#8E8E93]">{entry.total_steps.toLocaleString()} Steps</p>
							</div>
							<span className="text-xs font-bold text-[#FFD700]">
								{Math.round((entry.total_steps / Math.max(1, prizePool)) * 100)}%
							</span>
						</div>
					))}
				</div>
			)}

			{entries.length === 0 && (
				<p className="text-[#8E8E93] text-sm text-center mt-6">
					No participants yet. Be the first!
				</p>
			)}
		</div>
	);
}

function PodiumItem({
	entry,
	rank,
	height,
	ringColor,
	crown,
}: {
	entry: LeaderboardEntry;
	rank: number;
	height: string;
	ringColor: string;
	crown?: boolean;
}) {
	const ordinal = rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd";

	return (
		<div className="flex flex-col items-center w-24">
			{/* Avatar with ring */}
			<div className="relative mb-2">
				{crown && (
					<span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[#FFD700] text-lg">
						&#9818;
					</span>
				)}
				<div
					className={`w-14 h-14 rounded-full border-2 ${ringColor} bg-[#1c1c1e] flex items-center justify-center`}
				>
					<span className="text-white font-bold text-lg">{entry.users.full_name.charAt(0)}</span>
				</div>
			</div>

			{/* Name */}
			<p className="text-xs text-white font-medium truncate w-full text-center">
				{entry.users.full_name.split(" ")[0]}
			</p>
			<p className="text-[10px] text-[#8E8E93]">{entry.total_steps.toLocaleString()}</p>

			{/* Podium block */}
			<div
				className={`w-full ${height} rounded-t-xl bg-[#1c1c1e] border border-[#2c2c2e] mt-2 flex items-start justify-center pt-2`}
			>
				<span className="text-xs font-bold text-[#FFD700]">{ordinal}</span>
			</div>
		</div>
	);
}
