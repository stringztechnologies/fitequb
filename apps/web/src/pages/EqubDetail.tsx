import type { EqubRoom } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
	const progress = room.status === "active" ? calculateDaysRemaining(room.end_date) : null;

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
			// Free Equb — joined directly, reload
			window.location.reload();
		}
	}

	return (
		<div className="p-4 pb-20">
			<h1 className="text-xl font-bold text-tg-text">{room.name}</h1>

			<div className="grid grid-cols-2 gap-3 mt-4">
				<StatCard
					label="Stake"
					value={room.stake_amount > 0 ? `${room.stake_amount} ETB` : "Free"}
				/>
				<StatCard label="Duration" value={`${room.duration_days} days`} />
				<StatCard label="Target" value={`${room.workout_target} workouts`} />
				<StatCard label="Threshold" value={`${Math.round(room.completion_pct * 100)}%`} />
			</div>

			{progress !== null && (
				<div className="mt-4 bg-tg-secondary-bg rounded-xl p-3">
					<p className="text-xs text-tg-hint">Days remaining</p>
					<p className="text-lg font-bold text-tg-text">{progress}</p>
				</div>
			)}

			<div className="mt-4">
				<h2 className="font-semibold text-tg-text mb-2">
					Members ({members.length}/{room.max_members})
				</h2>
				{members.length === 0 ? (
					<p className="text-sm text-tg-hint">No members yet</p>
				) : (
					<div className="space-y-2">
						{members.map((m) => (
							<div
								key={m.id}
								className="flex justify-between items-center bg-tg-secondary-bg rounded-lg p-3"
							>
								<span className="text-sm text-tg-text">{m.users.full_name}</span>
								<span className="text-xs text-tg-hint">
									{m.completed_days}/{room.workout_target}
								</span>
							</div>
						))}
					</div>
				)}
			</div>

			{room.status === "pending" && (
				<button
					type="button"
					onClick={handleJoin}
					disabled={joining}
					className="w-full mt-6 bg-tg-button text-tg-button-text py-3 rounded-xl font-semibold disabled:opacity-50"
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

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-tg-secondary-bg rounded-xl p-3">
			<p className="text-xs text-tg-hint">{label}</p>
			<p className="text-sm font-semibold text-tg-text mt-0.5">{value}</p>
		</div>
	);
}

function calculateDaysRemaining(endDate: string): number {
	const diff = new Date(endDate).getTime() - Date.now();
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
