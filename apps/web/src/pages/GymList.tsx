import type { PartnerGym } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

const FILTERS = ["Near Me", "Top Rated", "Cheapest"] as const;

export function GymList() {
	const [gyms, setGyms] = useState<PartnerGym[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState("Near Me");
	const [search, setSearch] = useState("");

	useEffect(() => {
		api<PartnerGym[]>("/api/gyms")
			.then((res) => {
				if (res.data) setGyms(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	const q = search.toLowerCase();

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
			<div
				style={{
					display: "flex",
					gap: "8px",
					padding: "0 16px 16px",
					overflowX: "auto",
				}}
			>
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

			{/* Equb Eligible explainer */}
			<p
				style={{
					fontSize: "11px",
					color: "#8E8E93",
					padding: "0 16px 8px",
					margin: 0,
				}}
			>
				<span style={{ color: "#00C853", fontWeight: 700 }}>Equb Eligible</span> = Check-ins count
				toward your Equb workout target
			</p>

			{/* Gym cards */}
			<div
				style={{
					padding: "0 16px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
			>
				{filteredReal.length > 0 ? (
					filteredReal.map((g) => <RealGymCard key={g.id} gym={g} />)
				) : (
					<div
						style={{
							textAlign: "center",
							padding: "48px 24px",
							backgroundColor: "#1c1c1e",
							borderRadius: "16px",
							border: "1px solid rgba(255,255,255,0.08)",
						}}
					>
						<svg
							viewBox="0 0 24 24"
							style={{ width: "48px", height: "48px", margin: "0 auto 16px" }}
							fill="none"
							stroke="#3a3a3c"
							strokeWidth={1.5}
						>
							<path d="M6.5 6.5h11M4 12h16M6.5 17.5h11M2 10h2v4H2zm18 0h2v4h-2z" />
						</svg>
						<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FFF", margin: "0 0 8px" }}>
							{q ? "No Gyms Found" : "No Partner Gyms Yet"}
						</h3>
						<p style={{ fontSize: "14px", color: "#8E8E93", margin: 0, lineHeight: 1.5 }}>
							{q
								? "Try a different search term."
								: "Partner gyms will appear here once available in your area."}
						</p>
					</div>
				)}
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
				<h3
					style={{
						fontSize: "18px",
						fontWeight: 700,
						color: "#FFF",
						margin: 0,
					}}
				>
					{gym.name}
				</h3>
				<p style={{ fontSize: "12px", color: "#8E8E93", margin: "2px 0 0" }}>{gym.location}</p>
				<p
					style={{
						fontSize: "20px",
						fontWeight: 700,
						color: "#FFD700",
						margin: "6px 0 0",
					}}
				>
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
