import { useEffect, useState } from "react";
import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

interface ProfileData {
	total_points: number;
	referral_code: string;
	badges: { id: string; name: string; icon: string; earned: boolean }[];
}

interface PointEntry {
	id: string;
	points: number;
	reason: string;
	created_at: string;
}

const DEMO_BADGES = [
	{ id: "1", name: "Early Bird", icon: "\u{1F305}", earned: true },
	{ id: "2", name: "100k Steps", icon: "\u{1F45F}", earned: true },
	{ id: "3", name: "Marathoner", icon: "\u{1F3C3}", earned: true },
	{ id: "4", name: "Team Player", icon: "\u{1F91D}", earned: true },
	{ id: "5", name: "Iron Will", icon: "\u{1F4AA}", earned: false },
	{ id: "6", name: "Champion", icon: "\u{1F3C6}", earned: false },
];

const DEMO_EARNINGS = [
	{
		id: "1",
		reason: "Oct 15, 2023 - Equb Payout",
		points: 3200,
		created_at: "2023-10-15",
	},
	{
		id: "2",
		reason: "Sep 10, 2023 - Step Challenge",
		points: 850,
		created_at: "2023-09-10",
	},
	{
		id: "3",
		reason: "Aug 28, 2023 - Equb Payout",
		points: 2900,
		created_at: "2023-08-28",
	},
	{
		id: "4",
		reason: "Aug 5, 2023 - Early Goal Bonus",
		points: 500,
		created_at: "2023-08-05",
	},
];

export function Profile() {
	const { user, loading: authLoading } = useAuth();
	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [points, setPoints] = useState<PointEntry[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([
			api<ProfileData>("/api/gamification/profile"),
			api<PointEntry[]>("/api/gamification/points"),
		])
			.then(([p, e]) => {
				if (p.data) setProfile(p.data);
				if (e.data) setPoints(e.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (authLoading || loading) return <Loading />;

	// Use demo data if not authenticated
	const name = user?.full_name ?? "Abebe Kebede";
	const initial = name.charAt(0).toUpperCase();
	const totalEarned = profile?.total_points ?? 15400;
	const totalSteps = 2543000;
	const badges = profile?.badges ?? DEMO_BADGES;
	const earnings = points.length > 0 ? points : DEMO_EARNINGS;

	return (
		<div style={{ backgroundColor: "#0a0a0a", paddingBottom: "96px" }}>
			{/* Settings gear */}
			<div
				style={{
					display: "flex",
					justifyContent: "flex-end",
					padding: "16px 16px 0",
				}}
			>
				<button
					type="button"
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						padding: "4px",
					}}
				>
					<svg
						viewBox="0 0 24 24"
						style={{ width: "22px", height: "22px" }}
						fill="none"
						stroke="#8E8E93"
						strokeWidth={2}
					>
						<circle cx="12" cy="12" r="3" />
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
					</svg>
				</button>
			</div>

			{/* Avatar with gold ring */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					paddingTop: "8px",
					marginBottom: "24px",
				}}
			>
				<div
					style={{
						width: "96px",
						height: "96px",
						borderRadius: "50%",
						border: "3px solid #FFD700",
						backgroundColor: "#1c1c1e",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						marginBottom: "12px",
						boxShadow: "0 0 20px rgba(255,215,0,0.3)",
					}}
				>
					<span style={{ fontSize: "40px", fontWeight: 700, color: "#FFF" }}>{initial}</span>
				</div>
				<h1
					style={{
						fontSize: "22px",
						fontWeight: 700,
						color: "#FFF",
						margin: 0,
					}}
				>
					{name}
				</h1>
			</div>

			{/* Stat cards — green border + cyan border */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: "12px",
					padding: "0 16px",
					marginBottom: "24px",
				}}
			>
				<div
					style={{
						border: "2px solid #00C853",
						borderRadius: "12px",
						padding: "12px",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "4px",
						}}
					>
						<span style={{ fontSize: "12px", color: "#00C853" }}>Total Earned</span>
						<span style={{ fontSize: "16px" }}>&#128176;</span>
					</div>
					<p
						style={{
							fontSize: "22px",
							fontWeight: 700,
							color: "#00C853",
							margin: 0,
						}}
					>
						ETB {totalEarned.toLocaleString()}
					</p>
				</div>
				<div
					style={{
						border: "2px solid #00BCD4",
						borderRadius: "12px",
						padding: "12px",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "4px",
						}}
					>
						<span style={{ fontSize: "12px", color: "#00BCD4" }}>Total Steps</span>
						<span style={{ fontSize: "16px" }}>&#127939;</span>
					</div>
					<p
						style={{
							fontSize: "22px",
							fontWeight: 700,
							color: "#00BCD4",
							margin: 0,
						}}
					>
						{totalSteps.toLocaleString()}
					</p>
				</div>
			</div>

			{/* Fitness Achievements */}
			<div style={{ padding: "0 16px", marginBottom: "24px" }}>
				<h2
					style={{
						fontSize: "20px",
						fontWeight: 700,
						color: "#FFF",
						marginBottom: "12px",
					}}
				>
					Fitness Achievements
				</h2>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(4, 1fr)",
						gap: "12px",
					}}
				>
					{badges.map((b) => (
						<div key={b.id} style={{ textAlign: "center", opacity: b.earned ? 1 : 0.4 }}>
							<div
								style={{
									width: "56px",
									height: "56px",
									borderRadius: "12px",
									backgroundColor: "#2c2c2e",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "28px",
									margin: "0 auto",
									position: "relative",
									border: b.earned ? "none" : "1px dashed rgba(255,255,255,0.2)",
								}}
							>
								{b.earned ? (
									b.icon
								) : (
									<svg
										viewBox="0 0 24 24"
										style={{ width: "20px", height: "20px" }}
										fill="none"
										stroke="#8E8E93"
										strokeWidth={2}
									>
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
										<path d="M7 11V7a5 5 0 0 1 10 0v4" />
									</svg>
								)}
							</div>
							<p
								style={{
									fontSize: "11px",
									color: "#8E8E93",
									marginTop: "4px",
								}}
							>
								{b.name}
							</p>
						</div>
					))}
				</div>
			</div>

			{/* Earning History */}
			<div style={{ padding: "0 16px", marginBottom: "24px" }}>
				<h2
					style={{
						fontSize: "20px",
						fontWeight: 700,
						color: "#FFF",
						marginBottom: "12px",
					}}
				>
					Earning History
				</h2>
				{earnings.map((e) => (
					<div
						key={e.id}
						style={{
							display: "flex",
							justifyContent: "space-between",
							padding: "10px 0",
							borderBottom: "1px solid rgba(255,255,255,0.05)",
						}}
					>
						<span style={{ fontSize: "14px", color: "#FFF" }}>{e.reason}</span>
						<span
							style={{
								fontSize: "16px",
								fontWeight: 700,
								color: "#00C853",
								flexShrink: 0,
								marginLeft: "8px",
							}}
						>
							ETB {e.points.toLocaleString()}
						</span>
					</div>
				))}
			</div>

			{/* Sync Fitness Data — outline button */}
			<div style={{ padding: "0 16px" }}>
				<button
					type="button"
					style={{
						width: "100%",
						padding: "14px",
						borderRadius: "12px",
						border: "2px solid #00C853",
						backgroundColor: "transparent",
						color: "#00C853",
						fontSize: "16px",
						fontWeight: 600,
						cursor: "pointer",
					}}
				>
					Sync Fitness Data
				</button>
				<p
					style={{
						fontSize: "11px",
						color: "#8E8E93",
						textAlign: "center",
						marginTop: "6px",
					}}
				>
					Last synced: 2 hours ago
				</p>
			</div>
		</div>
	);
}
