import type { EqubRoom } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

export function EqubList() {
	const [rooms, setRooms] = useState<EqubRoom[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api<EqubRoom[]>("/api/equb-rooms")
			.then((res) => {
				if (res.data) setRooms(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	return (
		<div className="p-4 pb-20">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-xl font-bold text-tg-text">Equb Rooms</h1>
				<a
					href="/equbs/create"
					className="bg-tg-button text-tg-button-text px-3 py-1.5 rounded-lg text-sm font-medium"
				>
					Create
				</a>
			</div>

			{rooms.length === 0 ? (
				<p className="text-tg-hint text-sm text-center mt-8">
					No rooms yet. Be the first to create one!
				</p>
			) : (
				<div className="space-y-3">
					{rooms.map((room) => (
						<a
							key={room.id}
							href={`/equbs/${room.id}`}
							className="block rounded-xl bg-tg-secondary-bg p-4 active:opacity-70"
						>
							<div className="flex justify-between items-start">
								<div>
									<h3 className="font-semibold text-tg-text">{room.name}</h3>
									<p className="text-xs text-tg-hint mt-1">
										{room.stake_amount > 0 ? `${room.stake_amount} ETB stake` : "Free"}
										{" · "}
										{room.duration_days} days
									</p>
								</div>
								<StatusBadge status={room.status} />
							</div>
						</a>
					))}
				</div>
			)}
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const colors: Record<string, string> = {
		pending: "bg-yellow-100 text-yellow-800",
		active: "bg-green-100 text-green-800",
		settling: "bg-blue-100 text-blue-800",
		settled: "bg-gray-100 text-gray-600",
		cancelled: "bg-red-100 text-red-800",
	};

	return (
		<span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] ?? "bg-gray-100"}`}>
			{status}
		</span>
	);
}
