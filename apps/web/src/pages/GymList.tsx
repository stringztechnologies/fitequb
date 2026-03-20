import type { PartnerGym } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

const filters = ["Near Me", "Top Rated", "Cheapest"] as const;

export function GymList() {
	const [gyms, setGyms] = useState<PartnerGym[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeFilter, setActiveFilter] = useState<string>("Near Me");

	useEffect(() => {
		api<PartnerGym[]>("/api/gyms")
			.then((res) => {
				if (res.data) setGyms(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	return (
		<div className="px-4 pt-5 pb-24">
			<h1 className="text-[20px] font-bold text-white text-center mb-4">Gym Day Passes List</h1>

			{/* Search Bar */}
			<div className="flex items-center gap-3 bg-[#2c2c2e] border border-[rgba(255,215,0,0.3)] rounded-[10px] px-4 py-3 mb-4">
				<svg
					viewBox="0 0 24 24"
					className="w-4 h-4 text-[#8E8E93] shrink-0"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					type="text"
					placeholder="Search gyms, locations..."
					className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#636366]"
				/>
				<svg
					viewBox="0 0 24 24"
					className="w-4 h-4 text-[#8E8E93] shrink-0"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
					<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
					<line x1="12" y1="19" x2="12" y2="23" />
				</svg>
			</div>

			{/* Filter Chips */}
			<div className="flex gap-2 mb-5 overflow-x-auto pb-1">
				{filters.map((f) => (
					<button
						key={f}
						type="button"
						onClick={() => setActiveFilter(f)}
						className={`px-4 py-1.5 rounded-[20px] text-[13px] font-medium shrink-0 transition-colors ${
							activeFilter === f
								? "border border-[#FFD700] text-[#FFD700]"
								: "border border-[rgba(255,255,255,0.15)] text-white"
						}`}
					>
						{f}
					</button>
				))}
			</div>

			{/* Gym Cards */}
			{gyms.length === 0 ? (
				<p className="text-[#8E8E93] text-[14px] text-center mt-8">No partner gyms available.</p>
			) : (
				<div className="space-y-3">
					{gyms.map((gym) => (
						<GymCard key={gym.id} gym={gym} />
					))}
				</div>
			)}
		</div>
	);
}

function GymCard({ gym }: { gym: PartnerGym }) {
	const [buying, setBuying] = useState(false);

	async function handleBuy() {
		setBuying(true);
		const res = await api<{ checkout_url: string }>("/api/gyms/day-passes", {
			method: "POST",
			body: JSON.stringify({ gym_id: gym.id }),
		});
		setBuying(false);
		if (res.data?.checkout_url) {
			window.open(res.data.checkout_url, "_blank");
		}
	}

	return (
		<div
			className="relative rounded-[12px] border border-[rgba(255,215,0,0.3)] overflow-hidden"
			style={{ minHeight: "120px" }}
		>
			{/* Dark gradient overlay for readability */}
			<div className="absolute inset-0 bg-gradient-to-r from-[#1c1c1e] via-[#1c1c1e] to-[rgba(28,28,30,0.7)]" />

			{/* Content */}
			<div className="relative px-4 py-3.5 flex flex-col justify-between h-full">
				{/* Top row */}
				<div className="flex items-start justify-between">
					<div>
						<h3 className="text-[18px] font-bold text-white">{gym.name}</h3>
						<p className="text-[12px] text-[#8E8E93] mt-0.5">{gym.location}</p>
						<p className="text-[20px] font-bold text-[#FFD700] mt-1">{gym.app_day_pass} ETB</p>
					</div>

					{/* Equb Eligible badge */}
					<span className="px-2 py-1 rounded-[4px] bg-[#00C853] text-white text-[10px] font-bold flex items-center gap-1">
						Equb Eligible
						<svg
							viewBox="0 0 24 24"
							className="w-3 h-3"
							fill="none"
							stroke="currentColor"
							strokeWidth={3}
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</span>
				</div>

				{/* Buy Pass button */}
				<div className="flex justify-end mt-2">
					<button
						type="button"
						onClick={handleBuy}
						disabled={buying}
						className="bg-[#00C853] text-white px-5 py-2 rounded-[8px] text-[13px] font-bold disabled:opacity-50 active:scale-95 transition-transform"
					>
						{buying ? "..." : "Buy Pass"}
					</button>
				</div>
			</div>
		</div>
	);
}
