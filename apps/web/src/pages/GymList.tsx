import type { PartnerGym } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

const DEMO_GYMS = [
	{ id: "d1", name: "Kuriftu Gym", location: "Bole", price: 150, equbEligible: true },
	{ id: "d2", name: "Zebra Fitness", location: "Lideta", price: 180, equbEligible: true },
	{ id: "d3", name: "O-Zone Gym", location: "Kazanchis", price: 200, equbEligible: true },
	{ id: "d4", name: "Golden Gym", location: "Bole", price: 120, equbEligible: false },
	{ id: "d5", name: "Fitness Point", location: "Sarbet", price: 160, equbEligible: false },
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
		if (filter === "Top Rated") return a.name.localeCompare(b.name);
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
		<div style={{ backgroundColor: "#0a0a0a", paddingBottom: "96px" }}>
			<h1
				style={{
					fontSize: "22px",
					fontWeight: 700,
					color: "#FFF",
					textAlign: "center",
					padding: "20px 16px 12px",
				}}
			>
				Gym Day Passes List
			</h1>

			{/* Search bar */}
			<div
				style={{
					margin: "0 16px 12px",
					display: "flex",
					alignItems: "center",
					gap: "10px",
					backgroundColor: "#2c2c2e",
					border: "1px solid rgba(255,215,0,0.3)",
					borderRadius: "10px",
					padding: "12px 16px",
				}}
			>
				<svg
					viewBox="0 0 24 24"
					style={{ width: "16px", height: "16px", flexShrink: 0 }}
					fill="none"
					stroke="#8E8E93"
					strokeWidth={2}
				>
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					type="text"
					placeholder="Search gyms, locations..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					style={{
						flex: 1,
						backgroundColor: "transparent",
						border: "none",
						outline: "none",
						color: "#FFF",
						fontSize: "14px",
					}}
				/>
				<svg
					viewBox="0 0 24 24"
					style={{ width: "16px", height: "16px", flexShrink: 0 }}
					fill="none"
					stroke="#8E8E93"
					strokeWidth={2}
				>
					<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
					<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
				</svg>
			</div>

			{/* Filter chips */}
			<div style={{ display: "flex", gap: "8px", padding: "0 16px 16px", overflowX: "auto" }}>
				{FILTERS.map((f) => (
					<button
						key={f}
						type="button"
						onClick={() => setFilter(f)}
						style={{
							padding: "6px 16px",
							borderRadius: "20px",
							fontSize: "13px",
							fontWeight: 500,
							border: filter === f ? "1px solid #FFD700" : "1px solid rgba(255,255,255,0.15)",
							color: filter === f ? "#FFD700" : "#FFF",
							backgroundColor: "transparent",
							cursor: "pointer",
							flexShrink: 0,
						}}
					>
						{f}
					</button>
				))}
			</div>

			{/* Gym cards */}
			<div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
				{hasReal
					? filteredReal.map((g) => <RealGymCard key={g.id} gym={g} />)
					: filteredDemos.map((g) => (
							<DemoGymCard key={g.id} gym={g} onBuy={() => navigate("/payment")} />
						))}
			</div>
		</div>
	);
}

function DemoGymCard({ gym, onBuy }: { gym: (typeof DEMO_GYMS)[number]; onBuy: () => void }) {
	return (
		<div
			style={{
				position: "relative",
				borderRadius: "12px",
				border: "1px solid rgba(255,215,0,0.3)",
				overflow: "hidden",
				minHeight: "110px",
				backgroundColor: "#1c1c1e",
			}}
		>
			{/* Content */}
			<div
				style={{
					position: "relative",
					padding: "14px 16px",
					display: "flex",
					justifyContent: "space-between",
					zIndex: 1,
				}}
			>
				<div>
					<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FFF", margin: 0 }}>
						{gym.name}
					</h3>
					<p style={{ fontSize: "12px", color: "#8E8E93", margin: "2px 0 0" }}>{gym.location}</p>
					<p style={{ fontSize: "20px", fontWeight: 700, color: "#FFD700", margin: "6px 0 0" }}>
						{gym.price} ETB
					</p>
				</div>
				<div
					style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}
				>
					{gym.equbEligible && (
						<span
							style={{
								padding: "4px 8px",
								borderRadius: "4px",
								backgroundColor: "#00C853",
								color: "#FFF",
								fontSize: "11px",
								fontWeight: 700,
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
						>
							Equb Eligible &#10003;
						</span>
					)}
					<button
						type="button"
						onClick={onBuy}
						style={{
							padding: "8px 20px",
							borderRadius: "8px",
							backgroundColor: "#00C853",
							color: "#FFF",
							fontSize: "14px",
							fontWeight: 700,
							border: "none",
							cursor: "pointer",
						}}
					>
						Buy Pass
					</button>
				</div>
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
		<div
			style={{
				borderRadius: "12px",
				border: "1px solid rgba(255,215,0,0.3)",
				backgroundColor: "#1c1c1e",
				padding: "14px 16px",
				display: "flex",
				justifyContent: "space-between",
			}}
		>
			<div>
				<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FFF", margin: 0 }}>{gym.name}</h3>
				<p style={{ fontSize: "12px", color: "#8E8E93", margin: "2px 0 0" }}>{gym.location}</p>
				<p style={{ fontSize: "20px", fontWeight: 700, color: "#FFD700", margin: "6px 0 0" }}>
					{gym.app_day_pass} ETB
				</p>
			</div>
			<button
				type="button"
				onClick={handleBuy}
				disabled={buying}
				style={{
					padding: "8px 20px",
					borderRadius: "8px",
					backgroundColor: "#00C853",
					color: "#FFF",
					fontSize: "14px",
					fontWeight: 700,
					border: "none",
					cursor: "pointer",
					alignSelf: "flex-end",
				}}
			>
				{buying ? "..." : "Buy Pass"}
			</button>
		</div>
	);
}
