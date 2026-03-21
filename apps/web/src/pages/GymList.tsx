import type { PartnerGym } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

const DEMO_GYMS = [
	{
		id: "d1",
		name: "Kuriftu Gym",
		location: "Bole",
		price: 150,
		equbEligible: true,
		distance: "1.2 km",
		rating: 4.8,
	},
	{
		id: "d2",
		name: "Zebra Fitness",
		location: "Lideta",
		price: 180,
		equbEligible: true,
		distance: "2.5 km",
		rating: 4.6,
	},
	{
		id: "d3",
		name: "O-Zone Gym",
		location: "Kazanchis",
		price: 200,
		equbEligible: true,
		distance: "3.1 km",
		rating: 4.9,
	},
	{
		id: "d4",
		name: "Golden Gym",
		location: "Bole",
		price: 120,
		equbEligible: false,
		distance: "0.8 km",
		rating: 4.2,
	},
	{
		id: "d5",
		name: "Fitness Point",
		location: "Sarbet",
		price: 160,
		equbEligible: false,
		distance: "4.0 km",
		rating: 4.4,
	},
];

const FILTERS = ["Near Me", "Top Rated", "Cheapest"] as const;

export function GymList() {
	const [gyms, setGyms] = useState<PartnerGym[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState("Near Me");
	const [search, setSearch] = useState("");
	const navigate = useNavigate();

	useEffect(() => {
		api<PartnerGym[]>("/api/gyms")
			.then((res) => {
				if (res.data && res.data.length > 0) setGyms(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	const hasReal = gyms.length > 0;
	const q = search.toLowerCase();

	const filteredDemos = DEMO_GYMS.filter(
		(g) => !q || g.name.toLowerCase().includes(q) || g.location.toLowerCase().includes(q),
	).sort((a, b) => {
		if (filter === "Cheapest") return a.price - b.price;
		if (filter === "Top Rated") return b.rating - a.rating;
		return 0;
	});

	const filteredReal = gyms
		.filter((g) => !q || g.name.toLowerCase().includes(q) || g.location.toLowerCase().includes(q))
		.sort((a, b) => {
			if (filter === "Cheapest") return a.app_day_pass - b.app_day_pass;
			if (filter === "Top Rated") return a.name.localeCompare(b.name);
			return 0;
		});

	return (
		<div className="bg-surface pb-24 min-h-screen">
			{/* Title */}
			<div className="px-5 pt-10 pb-2">
				<h1 className="text-3xl font-headline font-extrabold text-on-surface">
					Gym Day
					<br />
					<span className="text-primary-fixed">Passes</span>
				</h1>
			</div>

			{/* Search bar */}
			<div className="mx-5 mb-4 flex items-center gap-3 bg-surface-container border border-outline-variant rounded-full px-4 py-3">
				<span className="material-symbols-rounded text-on-surface-variant text-lg shrink-0">
					search
				</span>
				<input
					type="text"
					placeholder="Search gyms, locations..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="flex-1 bg-transparent border-none outline-none text-on-surface font-body text-sm placeholder:text-on-surface-variant"
				/>
			</div>

			{/* Filter chips */}
			<div className="flex gap-3 overflow-x-auto pb-6 px-5 no-scrollbar">
				{FILTERS.map((f) => (
					<button
						key={f}
						type="button"
						onClick={() => setFilter(f)}
						className={
							filter === f
								? "px-5 py-2 bg-primary-container text-on-primary-container font-label font-bold rounded-full shadow-[0_4px_15px_rgba(0,200,83,0.3)] shrink-0 transition-all"
								: "px-5 py-2 bg-surface-container text-on-surface-variant font-label font-bold rounded-full shrink-0 transition-all"
						}
					>
						{f}
					</button>
				))}
			</div>

			{/* Equb Eligible explainer */}
			<p className="text-xs font-body text-on-surface-variant px-5 pb-4">
				<span className="text-primary font-bold">Equb Eligible</span> = Check-ins count
				toward your Equb workout target
			</p>

			{/* Gym cards */}
			<div className="px-5 flex flex-col gap-5">
				{hasReal
					? filteredReal.map((g) => <RealGymCard key={g.id} gym={g} />)
					: filteredDemos.map((g) => (
							<DemoGymCard
								key={g.id}
								gym={g}
								onBuy={() =>
									navigate("/payment", {
										state: {
											type: "gym_pass",
											equbName: g.name,
											stakeAmount: g.price,
											payout: 0,
											requirement: `Day pass at ${g.name}`,
										},
									})
								}
							/>
						))}
			</div>
		</div>
	);
}

function DemoGymCard({
	gym,
	onBuy,
}: {
	gym: (typeof DEMO_GYMS)[number];
	onBuy: () => void;
}) {
	return (
		<div className="rounded-lg overflow-hidden bg-surface-container-low shadow-2xl">
			{/* Image area with gradient overlay */}
			<div className="h-64 relative bg-surface-container">
				{/* Placeholder gym icon */}
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="material-symbols-rounded text-outline-variant text-7xl">
						fitness_center
					</span>
				</div>

				{/* Gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

				{/* Top badges */}
				<div className="absolute top-3 left-3 right-3 flex items-start justify-between">
					{gym.equbEligible && (
						<span
							className="bg-primary/20 backdrop-blur-md border border-primary/30 px-3 py-1.5 rounded-md flex items-center gap-1.5 text-primary font-label text-xs font-bold"
							title="Check-ins here count toward your Equb workout target"
						>
							<span className="material-symbols-rounded text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
								eco
							</span>
							Equb Eligible
						</span>
					)}
					{/* Distance chip */}
					<span className="glass-card px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 ml-auto">
						<span className="material-symbols-rounded text-on-surface-variant text-2xs">
							location_on
						</span>
						<span className="font-label text-2xs text-on-surface-variant">
							{gym.distance}
						</span>
					</span>
				</div>

				{/* Bottom content over gradient */}
				<div className="absolute bottom-4 left-4 right-4">
					<h3 className="text-2xl font-headline font-bold text-on-surface">
						{gym.name}
					</h3>
					<div className="flex items-center gap-1 mt-1">
						<span className="material-symbols-rounded text-on-surface-variant text-xs">
							location_on
						</span>
						<span className="text-xs font-body text-on-surface-variant">
							{gym.location}
						</span>
					</div>
				</div>
			</div>

			{/* Card footer */}
			<div className="p-4 flex items-center justify-between">
				<p className="text-2xl font-label font-bold text-secondary-container">
					{gym.price}
					<span className="text-xs ml-1">ETB</span>
				</p>
				<button
					type="button"
					onClick={onBuy}
					className="w-full ml-4 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-body font-bold rounded-full shadow-[0_8px_20px_rgba(0,200,83,0.2)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
				>
					Buy Day Pass
					<span className="material-symbols-rounded text-lg">arrow_forward</span>
				</button>
			</div>
		</div>
	);
}

function RealGymCard({ gym }: { gym: PartnerGym }) {
	const [buying, setBuying] = useState(false);
	async function handleBuy() {
		setBuying(true);
		const res = await api<{ checkout_url: string }>("/api/gyms/day-passes", {
			method: "POST",
			body: JSON.stringify({ gym_id: gym.id }),
		});
		setBuying(false);
		if (res.data?.checkout_url) window.open(res.data.checkout_url, "_blank");
	}
	return (
		<div className="rounded-lg overflow-hidden bg-surface-container-low shadow-2xl">
			{/* Image area with gradient overlay */}
			<div className="h-64 relative bg-surface-container">
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="material-symbols-rounded text-outline-variant text-7xl">
						fitness_center
					</span>
				</div>

				{/* Gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

				{/* Bottom content over gradient */}
				<div className="absolute bottom-4 left-4 right-4">
					<h3 className="text-2xl font-headline font-bold text-on-surface">
						{gym.name}
					</h3>
					<div className="flex items-center gap-1 mt-1">
						<span className="material-symbols-rounded text-on-surface-variant text-xs">
							location_on
						</span>
						<span className="text-xs font-body text-on-surface-variant">
							{gym.location}
						</span>
					</div>
				</div>
			</div>

			{/* Card footer */}
			<div className="p-4 flex items-center justify-between">
				<p className="text-2xl font-label font-bold text-secondary-container">
					{gym.app_day_pass}
					<span className="text-xs ml-1">ETB</span>
				</p>
				<button
					type="button"
					onClick={handleBuy}
					disabled={buying}
					className="w-full ml-4 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-body font-bold rounded-full shadow-[0_8px_20px_rgba(0,200,83,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
				>
					{buying ? "..." : "Buy Day Pass"}
					<span className="material-symbols-rounded text-lg">arrow_forward</span>
				</button>
			</div>
		</div>
	);
}
