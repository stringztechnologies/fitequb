import type { EqubRoom } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

interface RoomDetail {
	room: EqubRoom;
	members: Array<{
		id: string;
		user_id: string;
		completed_days: number;
		qualified: boolean | null;
		users: { full_name: string; username: string | null };
	}>;
}

export function EqubDetail() {
	const { id } = useParams<{ id: string }>();
	const [detail, setDetail] = useState<RoomDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [joining, setJoining] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		if (!id) return;
		api<RoomDetail>(`/api/equb-rooms/${id}`)
			.then((res) => {
				if (res.data) setDetail(res.data);
			})
			.finally(() => setLoading(false));
	}, [id]);

	if (loading || !detail) return <Loading />;

	const { room, members } = detail;
	const daysLeft = room.status === "active" ? calculateDaysRemaining(room.end_date) : null;
	const target = room.is_tsom
		? (room.tsom_workout_target ?? room.workout_target)
		: room.workout_target;

	async function handleJoin() {
		if (!id) return;
		setJoining(true);
		const res = await api<{ checkout_url: string | null }>(`/api/equb-rooms/${id}/join`, {
			method: "POST",
		});
		setJoining(false);
		if (res.data?.checkout_url) {
			window.open(res.data.checkout_url, "_blank");
		} else if (res.data) {
			window.location.reload();
		}
	}

	return (
		<div className="px-5 pt-6 pb-24">
			{/* Header */}
			<div className="flex items-center gap-3 mb-5">
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-bold text-white">{room.name}</h1>
						{room.is_tsom && (
							<span className="px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green text-[10px] font-bold">
								TSOM
							</span>
						)}
					</div>
					<StatusText status={room.status} />
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-2 gap-3">
				<StatCard
					label="Stake"
					value={room.stake_amount > 0 ? `${room.stake_amount}` : "Free"}
					unit={room.stake_amount > 0 ? "ETB" : ""}
					accent="gold"
				/>
				<StatCard label="Duration" value={`${room.duration_days}`} unit="days" />
				<StatCard label="Target" value={`${target}`} unit="workouts" accent="green" />
				<StatCard
					label="Threshold"
					value={`${Math.round((room.is_tsom ? (room.tsom_completion_pct ?? room.completion_pct) : room.completion_pct) * 100)}`}
					unit="%"
				/>
			</div>

			{/* Days Remaining */}
			{daysLeft !== null && (
				<div className="mt-4 rounded-2xl bg-brand-card border border-brand-border p-4 flex items-center justify-between">
					<span className="text-sm text-tg-hint">Days remaining</span>
					<span className="text-2xl font-bold text-brand-green">{daysLeft}</span>
				</div>
			)}

			{/* Members */}
			<div className="mt-5">
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-sm font-semibold text-white">
						Members ({members.length}/{room.max_members})
					</h2>
					{room.status === "active" && (
						<button
							type="button"
							onClick={() => navigate(`/equbs/${id}/log`)}
							className="text-brand-green text-xs font-semibold"
						>
							Log Workout
						</button>
					)}
				</div>

				{members.length === 0 ? (
					<p className="text-sm text-tg-hint bg-brand-card rounded-xl p-4 text-center">
						No members yet. Be the first!
					</p>
				) : (
					<div className="space-y-2">
						{members.map((m, i) => {
							const pct = target > 0 ? Math.round((m.completed_days / target) * 100) : 0;
							return (
								<div
									key={m.id}
									className="flex items-center gap-3 bg-brand-card border border-brand-border rounded-xl p-3"
								>
									<div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green text-xs font-bold">
										{i + 1}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-white font-medium truncate">{m.users.full_name}</p>
										<div className="flex items-center gap-2 mt-1">
											<div className="flex-1 h-1 rounded-full bg-brand-dark overflow-hidden">
												<div
													className="h-full rounded-full bg-brand-green transition-all"
													style={{ width: `${Math.min(100, pct)}%` }}
												/>
											</div>
											<span className="text-[10px] text-tg-hint font-medium w-12 text-right">
												{m.completed_days}/{target}
											</span>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Join Button */}
			{room.status === "pending" && (
				<button
					type="button"
					onClick={handleJoin}
					disabled={joining}
					className="w-full mt-6 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50 bg-gradient-green text-black shadow-glow active:scale-[0.98] transition-transform"
				>
					{joining
						? "Processing..."
						: room.stake_amount > 0
							? `Join for ${room.stake_amount} ETB`
							: "Join for Free"}
				</button>
			)}
		</div>
	);
}

function StatCard({
	label,
	value,
	unit,
	accent,
}: {
	label: string;
	value: string;
	unit?: string;
	accent?: "green" | "gold";
}) {
	const valueColor =
		accent === "green" ? "text-brand-green" : accent === "gold" ? "text-brand-gold" : "text-white";
	return (
		<div className="rounded-2xl bg-brand-card border border-brand-border p-3">
			<p className="text-[10px] text-tg-hint uppercase tracking-wider font-medium">{label}</p>
			<p className={`text-lg font-bold mt-0.5 ${valueColor}`}>
				{value}
				{unit && <span className="text-xs text-tg-hint font-normal ml-1">{unit}</span>}
			</p>
		</div>
	);
}

function StatusText({ status }: { status: string }) {
	const colors: Record<string, string> = {
		pending: "text-brand-gold",
		active: "text-brand-green",
		settling: "text-blue-400",
		settled: "text-tg-hint",
		cancelled: "text-red-400",
	};
	return (
		<p className={`text-xs font-medium mt-0.5 ${colors[status] ?? "text-tg-hint"}`}>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</p>
	);
}

function calculateDaysRemaining(endDate: string): number {
	const diff = new Date(endDate).getTime() - Date.now();
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
