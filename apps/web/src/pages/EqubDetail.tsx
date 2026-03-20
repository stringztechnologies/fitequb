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

const DEMO_DETAILS: Record<string, RoomDetail> = {
	"demo-1": {
		room: {
			id: "demo-1",
			name: "10k Steps Challenge",
			creator_id: "demo-creator",
			stake_amount: 500,
			duration_days: 30,
			workout_target: 25,
			completion_pct: 0.8,
			min_members: 5,
			max_members: 20,
			status: "active",
			start_date: new Date(Date.now() - 10 * 86400000).toISOString(),
			end_date: new Date(Date.now() + 20 * 86400000).toISOString(),
			sponsor_prize: 0,
			is_tsom: false,
			tsom_workout_target: null,
			tsom_completion_pct: null,
			created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
		},
		members: [
			{
				id: "m1",
				user_id: "u1",
				completed_days: 9,
				qualified: null,
				users: { full_name: "Abebe Kebede", username: "abebe_k" },
			},
			{
				id: "m2",
				user_id: "u2",
				completed_days: 7,
				qualified: null,
				users: { full_name: "Tigist Haile", username: "tigist_h" },
			},
			{
				id: "m3",
				user_id: "u3",
				completed_days: 5,
				qualified: null,
				users: { full_name: "Dawit Mekonnen", username: "dawit_m" },
			},
		],
	},
	"demo-2": {
		room: {
			id: "demo-2",
			name: "Gym Warriors",
			creator_id: "demo-creator",
			stake_amount: 1000,
			duration_days: 30,
			workout_target: 20,
			completion_pct: 0.75,
			min_members: 5,
			max_members: 20,
			status: "active",
			start_date: new Date(Date.now() - 5 * 86400000).toISOString(),
			end_date: new Date(Date.now() + 25 * 86400000).toISOString(),
			sponsor_prize: 0,
			is_tsom: false,
			tsom_workout_target: null,
			tsom_completion_pct: null,
			created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
		},
		members: [
			{
				id: "m4",
				user_id: "u4",
				completed_days: 4,
				qualified: null,
				users: { full_name: "Selam Tadesse", username: "selam_t" },
			},
			{
				id: "m5",
				user_id: "u5",
				completed_days: 3,
				qualified: null,
				users: { full_name: "Yonas Girma", username: "yonas_g" },
			},
			{
				id: "m6",
				user_id: "u6",
				completed_days: 2,
				qualified: null,
				users: { full_name: "Hanna Bekele", username: null },
			},
		],
	},
	"demo-3": {
		room: {
			id: "demo-3",
			name: "15k Steps Elite",
			creator_id: "demo-creator",
			stake_amount: 250,
			duration_days: 14,
			workout_target: 12,
			completion_pct: 0.8,
			min_members: 3,
			max_members: 15,
			status: "pending",
			start_date: new Date(Date.now() + 1 * 86400000).toISOString(),
			end_date: new Date(Date.now() + 15 * 86400000).toISOString(),
			sponsor_prize: 0,
			is_tsom: false,
			tsom_workout_target: null,
			tsom_completion_pct: null,
			created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
		},
		members: [
			{
				id: "m7",
				user_id: "u7",
				completed_days: 0,
				qualified: null,
				users: { full_name: "Meron Assefa", username: "meron_a" },
			},
			{
				id: "m8",
				user_id: "u8",
				completed_days: 0,
				qualified: null,
				users: { full_name: "Bereket Wolde", username: "bereket_w" },
			},
			{
				id: "m9",
				user_id: "u9",
				completed_days: 0,
				qualified: null,
				users: { full_name: "Lidya Tesfaye", username: null },
			},
		],
	},
};

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
				if (res.data) {
					setDetail(res.data);
				} else if (DEMO_DETAILS[id]) {
					setDetail(DEMO_DETAILS[id]);
				}
			})
			.catch(() => {
				if (DEMO_DETAILS[id]) setDetail(DEMO_DETAILS[id]);
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
							<span className="px-2 py-0.5 rounded-full bg-[rgba(0,200,83,0.15)] text-[#00C853] text-[10px] font-bold">
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

			{/* Threshold Explanation */}
			<div className="mt-3 rounded-[12px] bg-[rgba(255,215,0,0.08)] border border-[rgba(255,215,0,0.2)] p-3">
				<p className="text-[11px] text-[#8E8E93] m-0">
					<span className="text-[#FFD700] font-bold">
						Threshold{" "}
						{Math.round(
							(room.is_tsom
								? (room.tsom_completion_pct ?? room.completion_pct)
								: room.completion_pct) * 100,
						)}
						%
					</span>{" "}
					= Complete at least{" "}
					{Math.ceil(
						target *
							(room.is_tsom
								? (room.tsom_completion_pct ?? room.completion_pct)
								: room.completion_pct),
					)}{" "}
					of {target} workouts to qualify for the payout
				</p>
			</div>

			{/* Days Remaining with progress bar */}
			{daysLeft !== null && (
				<div className="mt-4 rounded-[16px] bg-[#1c1c1e] border border-[#2c2c2e] p-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm text-[#8E8E93]">Days remaining</span>
						<span className="text-2xl font-bold text-[#00C853]">{daysLeft}</span>
					</div>
					<div className="w-full h-1.5 rounded-full bg-[#0a0a0a] overflow-hidden">
						<div
							className="h-full rounded-full bg-[#00C853] transition-all"
							style={{
								width: `${Math.max(0, Math.min(100, ((room.duration_days - daysLeft) / room.duration_days) * 100))}%`,
							}}
						/>
					</div>
					<p className="text-[10px] text-[#8E8E93] mt-1 text-right">
						Day {room.duration_days - daysLeft} of {room.duration_days}
					</p>
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
							className="text-[#00C853] text-xs font-semibold"
						>
							Log Workout
						</button>
					)}
				</div>

				{members.length === 0 ? (
					<p className="text-sm text-[#8E8E93] bg-[#1c1c1e] rounded-xl p-4 text-center">
						No members yet. Be the first!
					</p>
				) : (
					<div className="space-y-2">
						{members.map((m, i) => {
							const pct = target > 0 ? Math.round((m.completed_days / target) * 100) : 0;
							return (
								<div
									key={m.id}
									className="flex items-center gap-3 bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-3"
								>
									<div className="w-8 h-8 rounded-full bg-[rgba(0,200,83,0.1)] flex items-center justify-center text-[#00C853] text-xs font-bold">
										{i + 1}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-white font-medium truncate">{m.users.full_name}</p>
										<div className="flex items-center gap-2 mt-1">
											<div className="flex-1 h-1 rounded-full bg-[#0a0a0a] overflow-hidden">
												<div
													className="h-full rounded-full bg-[#00C853] transition-all"
													style={{ width: `${Math.min(100, pct)}%` }}
												/>
											</div>
											<span className="text-[10px] text-[#8E8E93] font-medium w-12 text-right">
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

			{/* Join / CTA Button */}
			{(room.status === "pending" || room.status === "active") && (
				<button
					type="button"
					onClick={handleJoin}
					disabled={joining}
					className="w-full mt-6 py-4 rounded-[16px] font-bold text-[16px] disabled:opacity-50 bg-[#00C853] text-black shadow-[0_0_20px_rgba(0,200,83,0.4)] active:scale-[0.98] transition-transform"
				>
					{joining
						? "Processing..."
						: room.stake_amount > 0
							? `Join This Equb \u2014 ${room.stake_amount} ETB`
							: "Join This Equb \u2014 Free"}
				</button>
			)}
			{room.status === "pending" && members.length < room.max_members && (
				<p className="text-[11px] text-[#8E8E93] text-center mt-2">
					{room.max_members - members.length} spots remaining
				</p>
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
		accent === "green" ? "text-[#00C853]" : accent === "gold" ? "text-[#FFD700]" : "text-white";
	return (
		<div className="rounded-[16px] bg-[#1c1c1e] border border-[#2c2c2e] p-3">
			<p className="text-[10px] text-[#8E8E93] uppercase tracking-wider font-medium">{label}</p>
			<p className={`text-lg font-bold mt-0.5 ${valueColor}`}>
				{value}
				{unit && <span className="text-xs text-[#8E8E93] font-normal ml-1">{unit}</span>}
			</p>
		</div>
	);
}

function StatusText({ status }: { status: string }) {
	const colors: Record<string, string> = {
		pending: "text-[#FFD700]",
		active: "text-[#00C853]",
		settling: "text-blue-400",
		settled: "text-[#8E8E93]",
		cancelled: "text-red-400",
	};
	return (
		<p className={`text-xs font-medium mt-0.5 ${colors[status] ?? "text-[#8E8E93]"}`}>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</p>
	);
}

function calculateDaysRemaining(endDate: string): number {
	const diff = new Date(endDate).getTime() - Date.now();
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
