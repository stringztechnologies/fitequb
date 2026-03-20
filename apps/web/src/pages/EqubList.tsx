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
				<h1 className="text-[20px] font-bold text-white">FitEqub</h1>
				<p className="text-[13px] text-[#8E8E93] mt-0.5">Equb Rooms</p>
			</div>

			{rooms.length === 0 ? (
				<div className="text-center mt-16">
					<p className="text-white font-semibold text-[15px]">No rooms yet</p>
					<p className="text-[#8E8E93] text-[13px] mt-1">Be the first to create one!</p>
					<button
						type="button"
						onClick={() => navigate("/equbs/create")}
						className="mt-4 bg-[#00C853] text-black px-6 py-2.5 rounded-[12px] text-[13px] font-bold"
					>
						+ Create Room
					</button>
				</div>
			) : (
				<div className="space-y-3">
					{rooms.map((room) => (
						<EqubCard key={room.id} room={room} onClick={() => navigate(`/equbs/${room.id}`)} />
					))}
				</div>
			)}
		</div>
	);
}

function EqubCard({ room, onClick }: { room: EqubRoom; onClick: () => void }) {
	const countdown = useCountdown(room.end_date);
	const payout = room.stake_amount * room.max_members;

	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full text-left rounded-[16px] bg-[#1c1c1e] border border-[rgba(255,255,255,0.1)] overflow-hidden active:bg-[#2c2c2e] transition-colors"
		>
			{/* Entry + Payout + Countdown row */}
			<div className="px-4 pt-4 pb-2.5">
				<div className="flex items-start justify-between gap-3">
					{/* Gold-bordered entry/payout box */}
					<div className="bg-[#2c2c2e] border border-[rgba(255,215,0,0.3)] rounded-[8px] px-3 py-2">
						<p className="text-white text-[14px] font-bold">
							Entry:{" "}
							<span className="text-[#FFD700]">
								{room.stake_amount > 0 ? `${room.stake_amount} ETB` : "Free"}
							</span>
						</p>
						<p className="text-white text-[14px] font-bold">
							Payout: <span className="text-[#FFD700]">{payout.toLocaleString()} ETB</span>
						</p>
					</div>

					{room.status === "active" && countdown && (
						<div className="text-right">
							<p className="text-[9px] text-[#FF9500] uppercase tracking-wider">Closes in</p>
							<p
								className="font-bold text-[22px] font-mono"
								style={{
									fontVariantNumeric: "tabular-nums",
									color: getCountdownColor(room.end_date),
								}}
							>
								{countdown}
							</p>
						</div>
					)}

					{room.status === "pending" && (
						<span className="px-4 py-1.5 rounded-[8px] border border-[#FFD700] text-[#FFD700] text-[13px] font-semibold">
							Join Now
						</span>
					)}
				</div>
			</div>

			{/* Requirements */}
			<div className="px-4 py-1.5 flex items-center gap-1.5">
				<span className="text-[#00C853] text-[12px]">&#9679;</span>
				<span className="text-[12px] text-[#8E8E93]">
					{room.workout_target} workouts / {room.duration_days} days
				</span>
				{room.is_tsom && (
					<span className="ml-auto px-1.5 py-0.5 rounded-[4px] bg-[rgba(0,200,83,0.15)] text-[#00C853] text-[9px] font-bold">
						TSOM
					</span>
				)}
			</div>

			{/* Fill bar */}
			<div className="px-4 pb-3.5 pt-1">
				<div className="flex items-center justify-between mb-1">
					<span className="text-[10px] text-[#8E8E93]">spots filled</span>
				</div>
				<div className="w-full h-[5px] rounded-full bg-[#0a0a0a] overflow-hidden">
					<div className="h-full rounded-full bg-[#00C853]" style={{ width: "30%" }} />
				</div>
			</div>
		</button>
	);
}

function getCountdownColor(endDate: string): string {
	const diff = new Date(endDate).getTime() - Date.now();
	if (diff < 3600000) return "#FF3B30";
	if (diff < 7200000) return "#FF9500";
	return "#FFD700";
}

function useCountdown(endDate: string): string | null {
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const t = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(t);
	}, []);

	const diff = new Date(endDate).getTime() - now;
	if (diff <= 0) return null;

	const h = Math.floor(diff / 3600000);
	const m = Math.floor((diff % 3600000) / 60000);
	const s = Math.floor((diff % 60000) / 1000);
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
