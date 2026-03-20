import type { EqubRoom } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

export function EqubList() {
	const [rooms, setRooms] = useState<EqubRoom[]>([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		api<EqubRoom[]>("/api/equb-rooms")
			.then((res) => {
				if (res.data) setRooms(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	return (
		<div className="px-4 pt-5 pb-24">
			<div className="text-center mb-5">
				<h1 className="text-xl font-bold text-white">FitEqub</h1>
				<p className="text-xs text-tg-hint mt-0.5">Equb Rooms</p>
			</div>

			{rooms.length === 0 ? (
				<div className="text-center mt-16">
					<div className="w-16 h-16 mx-auto rounded-full bg-brand-green/10 flex items-center justify-center mb-4">
						<svg
							viewBox="0 0 24 24"
							className="w-8 h-8 text-brand-green"
							fill="none"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						</svg>
					</div>
					<p className="text-white font-semibold">No rooms yet</p>
					<p className="text-tg-hint text-sm mt-1">Be the first to create one!</p>
					<button
						type="button"
						onClick={() => navigate("/equbs/create")}
						className="mt-4 bg-gradient-green text-black px-6 py-2.5 rounded-xl text-sm font-bold shadow-glow"
					>
						+ Create Room
					</button>
				</div>
			) : (
				<div className="space-y-3">
					{rooms.map((room) => (
						<EqubCard key={room.id} room={room} onClick={() => navigate(`/equbs/${room.id}`)} />
					))}

					<button
						type="button"
						onClick={() => navigate("/equbs/create")}
						className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-border text-tg-hint text-sm font-medium active:bg-brand-card transition-colors"
					>
						+ Create New Room
					</button>
				</div>
			)}
		</div>
	);
}

function EqubCard({ room, onClick }: { room: EqubRoom; onClick: () => void }) {
	const countdown = useCountdown(room.end_date);
	const potentialPayout = room.stake_amount * room.max_members;

	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full text-left rounded-2xl bg-brand-card border border-brand-border overflow-hidden active:bg-brand-card-hover transition-colors"
		>
			<div className="px-4 pt-3.5 pb-2">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-white text-sm">
							<span className="font-bold">
								Entry: {room.stake_amount > 0 ? `${room.stake_amount} ETB` : "Free"}
							</span>
						</p>
						<p className="text-tg-hint text-xs mt-0.5">
							Payout:{" "}
							<span className="text-brand-gold font-semibold">
								{potentialPayout.toLocaleString()} ETB
							</span>
						</p>
					</div>
					{room.status === "active" && countdown && (
						<div className="text-right">
							<p className="text-[10px] text-tg-hint uppercase">Closes in</p>
							<p className="text-brand-green font-bold text-sm font-mono">{countdown}</p>
						</div>
					)}
					{room.status === "pending" && (
						<span className="px-3 py-1.5 rounded-lg bg-gradient-green text-black text-xs font-bold shadow-glow">
							Join Now
						</span>
					)}
					{room.status !== "active" && room.status !== "pending" && (
						<StatusBadge status={room.status} />
					)}
				</div>
			</div>

			<div className="px-4 py-2 flex items-center gap-2">
				<svg
					viewBox="0 0 24 24"
					className="w-3.5 h-3.5 text-brand-green shrink-0"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
				</svg>
				<span className="text-xs text-tg-hint">
					{room.workout_target} workouts / {room.duration_days} days
				</span>
				{room.is_tsom && (
					<span className="px-1.5 py-0.5 rounded bg-brand-green/15 text-brand-green text-[9px] font-bold ml-auto">
						TSOM
					</span>
				)}
			</div>

			<div className="px-4 pb-3.5">
				<div className="w-full h-1.5 rounded-full bg-brand-dark overflow-hidden">
					<div
						className="h-full rounded-full bg-brand-green transition-all"
						style={{ width: "30%" }}
					/>
				</div>
			</div>
		</button>
	);
}

function StatusBadge({ status }: { status: string }) {
	const styles: Record<string, string> = {
		settling: "bg-blue-500/15 text-blue-400",
		settled: "bg-brand-border text-tg-hint",
		cancelled: "bg-red-500/15 text-red-400",
	};
	return (
		<span
			className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${styles[status] ?? "bg-brand-border text-tg-hint"}`}
		>
			{status}
		</span>
	);
}

function useCountdown(endDate: string): string | null {
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, []);

	const diff = new Date(endDate).getTime() - now;
	if (diff <= 0) return null;

	const h = Math.floor(diff / 3600000);
	const m = Math.floor((diff % 3600000) / 60000);
	const s = Math.floor((diff % 60000) / 1000);

	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
