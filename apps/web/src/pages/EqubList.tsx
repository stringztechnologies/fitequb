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
		<div className="px-5 pt-6 pb-24">
			<div className="flex items-center justify-between mb-5">
				<div>
					<h1 className="text-xl font-bold text-white">Equb Rooms</h1>
					<p className="text-xs text-tg-hint mt-0.5">
						{rooms.length} room{rooms.length !== 1 ? "s" : ""} available
					</p>
				</div>
				<button
					type="button"
					onClick={() => navigate("/equbs/create")}
					className="bg-gradient-green text-black px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform shadow-glow"
				>
					+ Create
				</button>
			</div>

			{rooms.length === 0 ? (
				<div className="text-center mt-16">
					<div className="w-16 h-16 mx-auto rounded-2xl bg-brand-green/10 flex items-center justify-center mb-4">
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
				</div>
			) : (
				<div className="space-y-3">
					{rooms.map((room) => (
						<button
							key={room.id}
							type="button"
							onClick={() => navigate(`/equbs/${room.id}`)}
							className="w-full text-left rounded-2xl bg-brand-card border border-brand-border p-4 active:bg-brand-card-hover transition-colors"
						>
							<div className="flex justify-between items-start">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<h3 className="font-semibold text-white text-sm truncate">{room.name}</h3>
										{room.is_tsom && (
											<span className="px-1.5 py-0.5 rounded bg-brand-green/15 text-brand-green text-[9px] font-bold">
												TSOM
											</span>
										)}
									</div>
									<div className="flex items-center gap-3 mt-1.5">
										<span className="text-xs text-tg-hint">
											{room.stake_amount > 0 ? (
												<>
													<span className="text-brand-gold font-semibold">{room.stake_amount}</span>{" "}
													ETB
												</>
											) : (
												<span className="text-brand-green font-semibold">Free</span>
											)}
										</span>
										<span className="w-1 h-1 rounded-full bg-brand-border" />
										<span className="text-xs text-tg-hint">{room.duration_days}d</span>
									</div>
								</div>
								<StatusBadge status={room.status} />
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const styles: Record<string, string> = {
		pending: "bg-brand-gold/15 text-brand-gold",
		active: "bg-brand-green/15 text-brand-green",
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
