import type { Challenge } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

const DEMO_LEADERS = [
	{ name: "Abeba T.", steps: 50000, etb: 7500 },
	{ name: "Dawit K.", steps: 48200, etb: 3750 },
	{ name: "Sara M.", steps: 45200, etb: 1875 },
	{ name: "Bereket H.", steps: 42000, etb: 950 },
	{ name: "Zemzem A.", steps: 40500, etb: 500 },
	{ name: "Yonas B.", steps: 38000, etb: 250 },
	{ name: "Marta D.", steps: 35000, etb: 100 },
];

export function ChallengeList() {
	const [challenges, setChallenges] = useState<Challenge[]>([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		api<Challenge[]>("/api/challenges")
			.then((res) => {
				if (res.data) setChallenges(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	const hasReal = challenges.length > 0;

	return (
		<div style={{ backgroundColor: "#0a0a0a", paddingBottom: "96px" }}>
			<h1
				style={{
					fontSize: "20px",
					fontWeight: 700,
					color: "#FFF",
					textAlign: "center",
					padding: "20px 16px 8px",
				}}
			>
				Step Challenge Leaderboard
			</h1>

			{/* Prize Pool Banner */}
			<div
				style={{
					margin: "0 16px 16px",
					padding: "16px",
					borderRadius: "12px",
					border: "2px solid #FFD700",
					background: "linear-gradient(180deg, #FFD700 0%, #B8860B 100%)",
					textAlign: "center",
				}}
			>
				<p
					style={{
						fontSize: "12px",
						fontWeight: 700,
						color: "#0a0a0a",
						letterSpacing: "2px",
						textTransform: "uppercase",
						margin: 0,
					}}
				>
					CURRENT PRIZE POOL
				</p>
				<p
					style={{
						fontSize: "32px",
						fontWeight: 700,
						color: "#0a0a0a",
						margin: "4px 0 0",
					}}
				>
					15,000 ETB
				</p>
				<p
					style={{
						fontSize: "11px",
						color: "#0a0a0a",
						opacity: 0.7,
						margin: "4px 0 0",
					}}
				>
					1st: 50% &middot; 2nd: 25% &middot; 3rd: 12.5% &middot; Others: shared
				</p>
			</div>

			{/* Resets countdown */}
			<p
				style={{
					fontSize: "12px",
					color: "#8E8E93",
					textAlign: "center",
					marginBottom: "12px",
				}}
			>
				Resets in 5 days
			</p>

			{/* Podium */}
			<div
				style={{
					display: "flex",
					alignItems: "flex-end",
					justifyContent: "center",
					gap: "8px",
					padding: "0 16px",
					marginBottom: "16px",
				}}
			>
				{/* 2nd */}
				<Podium
					name="Dawit K."
					steps="48,200"
					etb="3,750"
					rank={2}
					height={100}
					color="#C0C0C0"
					darkColor="#808080"
					avatarSize={52}
				/>
				{/* 1st */}
				<Podium
					name="Abeba T."
					steps="50,000"
					etb="7,500"
					rank={1}
					height={140}
					color="#FFD700"
					darkColor="#B8860B"
					avatarSize={60}
					crown
				/>
				{/* 3rd */}
				<Podium
					name="Sara M."
					steps="45,200"
					etb="1,875"
					rank={3}
					height={80}
					color="#CD7F32"
					darkColor="#8B4513"
					avatarSize={48}
				/>
			</div>

			{/* Rank list 4+ */}
			<div style={{ padding: "0 16px", marginBottom: "16px" }}>
				{DEMO_LEADERS.slice(3).map((l, i) => {
					const isYou = l.name === "Zemzem A.";
					return (
						<div
							key={l.name}
							style={{
								display: "flex",
								alignItems: "center",
								padding: "12px 8px",
								borderBottom: "1px solid rgba(255,255,255,0.05)",
								gap: "12px",
								backgroundColor: isYou ? "rgba(0,200,83,0.08)" : "transparent",
								borderRadius: isYou ? "10px" : "0",
								border: isYou ? "1px solid rgba(0,200,83,0.3)" : "none",
							}}
						>
							<span
								style={{
									fontSize: "16px",
									fontWeight: 700,
									color: isYou ? "#00C853" : "#8E8E93",
									width: "24px",
									textAlign: "center",
								}}
							>
								{i + 4}
							</span>
							<div
								style={{
									width: "40px",
									height: "40px",
									borderRadius: "50%",
									backgroundColor: isYou ? "rgba(0,200,83,0.2)" : "#2c2c2e",
									border: isYou ? "2px solid #00C853" : "none",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<span style={{ fontSize: "16px", fontWeight: 700, color: "#FFF" }}>
									{l.name.charAt(0)}
								</span>
							</div>
							<div style={{ flex: 1 }}>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<p
										style={{
											fontSize: "16px",
											fontWeight: 700,
											color: "#FFF",
											margin: 0,
										}}
									>
										{l.name}
									</p>
									{isYou && (
										<span
											style={{
												fontSize: "10px",
												fontWeight: 700,
												color: "#0a0a0a",
												backgroundColor: "#00C853",
												padding: "1px 6px",
												borderRadius: "4px",
											}}
										>
											YOU
										</span>
									)}
								</div>
								<p style={{ fontSize: "14px", color: "#8E8E93", margin: 0 }}>
									{l.steps.toLocaleString()} Steps
								</p>
							</div>
							<span style={{ fontSize: "16px", fontWeight: 700, color: "#00C853" }}>
								{l.etb.toLocaleString()} ETB
							</span>
						</div>
					);
				})}
			</div>

			{/* CTA */}
			<div style={{ padding: "0 16px" }}>
				<button
					type="button"
					onClick={() => (hasReal ? navigate(`/challenges/${challenges[0]?.id}`) : undefined)}
					style={{
						width: "100%",
						padding: "16px",
						borderRadius: "12px",
						backgroundColor: "#00C853",
						color: "#FFF",
						fontSize: "18px",
						fontWeight: 700,
						border: "none",
						cursor: "pointer",
						textTransform: "uppercase",
						letterSpacing: "1px",
						boxShadow: "0 0 20px rgba(0,200,83,0.4)",
					}}
				>
					UPDATE MY STEPS
				</button>
			</div>
		</div>
	);
}

function Podium({
	name,
	steps,
	etb,
	rank,
	height,
	color,
	darkColor,
	avatarSize,
	crown,
}: {
	name: string;
	steps: string;
	etb: string;
	rank: number;
	height: number;
	color: string;
	darkColor: string;
	avatarSize: number;
	crown?: boolean;
}) {
	const ordinal = rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd";
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				width: rank === 1 ? "120px" : "100px",
			}}
		>
			{/* Avatar */}
			<div style={{ position: "relative", marginBottom: "6px" }}>
				{crown && (
					<span
						style={{
							position: "absolute",
							top: "-14px",
							left: "50%",
							transform: "translateX(-50%)",
							fontSize: "18px",
							color: "#FFD700",
						}}
					>
						&#9818;
					</span>
				)}
				<div
					style={{
						width: `${avatarSize}px`,
						height: `${avatarSize}px`,
						borderRadius: "50%",
						border: `3px solid ${color}`,
						backgroundColor: "#1c1c1e",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<span
						style={{
							fontSize: `${avatarSize * 0.4}px`,
							fontWeight: 700,
							color: "#FFF",
						}}
					>
						{name.charAt(0)}
					</span>
				</div>
			</div>
			<p
				style={{
					fontSize: rank === 1 ? "14px" : "12px",
					fontWeight: 700,
					color: "#FFF",
					margin: 0,
				}}
			>
				{name}
			</p>
			<p style={{ fontSize: "11px", color: "#8E8E93", margin: "1px 0" }}>{steps} Steps</p>
			<p
				style={{
					fontSize: rank === 1 ? "14px" : "12px",
					fontWeight: 700,
					color: "#00C853",
					margin: 0,
				}}
			>
				{etb} ETB
			</p>

			{/* Pedestal */}
			<div
				style={{
					width: "100%",
					height: `${height}px`,
					borderRadius: "12px 12px 0 0",
					background: `linear-gradient(180deg, ${color} 0%, ${darkColor} 100%)`,
					marginTop: "8px",
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "center",
					paddingTop: "8px",
				}}
			>
				<span
					style={{
						fontSize: rank === 1 ? "16px" : "14px",
						fontWeight: 700,
						color: "#0a0a0a",
					}}
				>
					{ordinal}
				</span>
			</div>
		</div>
	);
}
