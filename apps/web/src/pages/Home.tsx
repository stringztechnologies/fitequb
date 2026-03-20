import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

interface ProfileSummary {
	total_points: number;
	level: { level: number; name: string; min_points: number; perk: string | null };
	next_level: { level: number; name: string; min_points: number } | null;
	points_to_next: number;
}

export function Home() {
	const { user, loading } = useAuth();
	const [profile, setProfile] = useState<ProfileSummary | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		api<ProfileSummary>("/api/gamification/profile").then((res) => {
			if (res.data) setProfile(res.data);
		});
	}, []);

	if (loading) return <Loading />;

	const progressPct = profile?.next_level
		? Math.min(
				100,
				((profile.total_points - profile.level.min_points) /
					(profile.next_level.min_points - profile.level.min_points)) *
					100,
			)
		: 75;

	const circ = 2 * Math.PI * 80;
	const displayAmount = profile?.total_points ?? 12500;

	return (
		<div className="pb-24" style={{ backgroundColor: "#0a0a0a" }}>
			{/* Header — 36px bold per spec */}
			<div className="px-4 pt-5 pb-1">
				<h1 style={{ fontSize: "36px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1 }}>
					FitEqub
				</h1>
				<p style={{ fontSize: "14px", color: "#8E8E93", marginTop: "4px" }}>
					{user ? `Welcome, ${user.full_name}` : "Stake. Sweat. Split the pot."}
				</p>
			</div>

			{/* Progress Ring Card — bg #1c1c1e, 16px radius, 24px padding */}
			<div
				style={{
					margin: "24px 16px 0",
					backgroundColor: "#1c1c1e",
					borderRadius: "16px",
					padding: "24px",
					textAlign: "center",
				}}
			>
				{/* Title case, not uppercase */}
				<p style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF", marginBottom: "16px" }}>
					Your Progress
				</p>

				{/* SVG Ring — 200px, 8px stroke, green glow */}
				<div className="flex justify-center">
					<div
						className="relative"
						style={{
							width: "200px",
							height: "200px",
							filter: "drop-shadow(0 0 20px rgba(0,200,83,0.5))",
						}}
					>
						<svg
							viewBox="0 0 200 200"
							style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
						>
							<circle cx="100" cy="100" r="80" fill="none" stroke="#2c2c2e" strokeWidth="8" />
							<circle
								cx="100"
								cy="100"
								r="80"
								fill="none"
								stroke="#00C853"
								strokeWidth="8"
								strokeLinecap="round"
								strokeDasharray={`${(progressPct / 100) * circ} ${circ}`}
							/>
						</svg>

						{/* Center text */}
						<div
							style={{
								position: "absolute",
								inset: 0,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<span style={{ fontSize: "32px", fontWeight: 700, color: "#00C853", lineHeight: 1 }}>
								{displayAmount.toLocaleString()} ETB
							</span>
							<span style={{ fontSize: "14px", color: "#FFD700", marginTop: "4px" }}>
								Potential Payout
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Feature Cards — 3 cards, each with icon box + progress bar */}
			<div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
				<FeatureCard
					title="Equb Rooms"
					subtitle="Join a fitness accountability group"
					badgeText="Ends in 2 days"
					badgeGreen={false}
					icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
					progress={65}
					onClick={() => navigate("/equbs")}
				/>
				<FeatureCard
					title="Gym Day Passes"
					subtitle="Discounted single-visit passes"
					badgeText="Discount Active"
					badgeGreen
					icon="M6.5 6.5h11M4 12h16M6.5 17.5h11M2 10h2v4H2zm18 0h2v4h-2z"
					progress={40}
					onClick={() => navigate("/gyms")}
				/>
				<FeatureCard
					title="Step Challenge"
					subtitle="Compete on the city leaderboard"
					badgeText="15,450 Steps"
					badgeGreen
					icon="M22 12 18 12 15 21 9 3 6 12 2 12"
					progress={80}
					onClick={() => navigate("/challenges")}
				/>
			</div>
		</div>
	);
}

function FeatureCard({
	title,
	subtitle,
	badgeText,
	badgeGreen,
	icon,
	progress,
	onClick,
}: {
	title: string;
	subtitle: string;
	badgeText: string;
	badgeGreen: boolean;
	icon: string;
	progress: number;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				width: "100%",
				display: "flex",
				alignItems: "center",
				gap: "12px",
				backgroundColor: "#1c1c1e",
				borderRadius: "16px",
				padding: "16px",
				border: "none",
				textAlign: "left",
				cursor: "pointer",
			}}
		>
			{/* Left icon box — 48x48, gold tint bg, 12px radius */}
			<div
				style={{
					width: "48px",
					height: "48px",
					minWidth: "48px",
					backgroundColor: "rgba(255,215,0,0.15)",
					borderRadius: "12px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<svg
					viewBox="0 0 24 24"
					style={{ width: "24px", height: "24px" }}
					fill="none"
					stroke="#FFD700"
					strokeWidth={1.8}
				>
					<path d={icon} />
				</svg>
			</div>

			{/* Content */}
			<div style={{ flex: 1, minWidth: 0 }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
					<span style={{ fontSize: "18px", fontWeight: 700, color: "#FFFFFF" }}>{title}</span>
					<span
						style={{
							fontSize: "12px",
							color: badgeGreen ? "#00C853" : "#8E8E93",
							fontWeight: 600,
							marginLeft: "8px",
							flexShrink: 0,
						}}
					>
						{badgeText}
					</span>
				</div>
				<p style={{ fontSize: "13px", color: "#8E8E93", marginTop: "2px" }}>{subtitle}</p>

				{/* Green progress bar — 4px height */}
				<div
					style={{
						width: "100%",
						height: "4px",
						backgroundColor: "#2c2c2e",
						borderRadius: "2px",
						marginTop: "8px",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							width: `${progress}%`,
							height: "100%",
							backgroundColor: "#00C853",
							borderRadius: "2px",
						}}
					/>
				</div>
			</div>
		</button>
	);
}
