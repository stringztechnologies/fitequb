import type { Challenge } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

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

	if (challenges.length === 0) {
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
				<div
					style={{
						textAlign: "center",
						padding: "48px 24px",
						margin: "16px",
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
						<path d="M22 12 18 12 15 21 9 3 6 12 2 12" />
					</svg>
					<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FFF", margin: "0 0 8px" }}>
						No Active Challenges
					</h3>
					<p style={{ fontSize: "14px", color: "#8E8E93", margin: 0, lineHeight: 1.5 }}>
						Step challenges will appear here when available. Check back soon!
					</p>
				</div>
			</div>
		);
	}

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

			{/* Challenge list */}
			<div
				style={{
					padding: "0 16px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
			>
				{challenges.map((c) => (
					<button
						key={c.id}
						type="button"
						onClick={() => navigate(`/challenges/${c.id}`)}
						style={{
							width: "100%",
							textAlign: "left",
							backgroundColor: "#1c1c1e",
							borderRadius: "16px",
							border: "1px solid rgba(255,255,255,0.1)",
							padding: "16px",
							cursor: "pointer",
						}}
					>
						<h3 style={{ fontSize: "16px", fontWeight: 700, color: "#FFF", margin: 0 }}>
							{c.name}
						</h3>
						<p style={{ fontSize: "13px", color: "#8E8E93", margin: "4px 0 0" }}>
							Prize: {c.prize_pool.toLocaleString()} ETB
						</p>
					</button>
				))}
			</div>

			{/* CTA */}
			<div style={{ padding: "16px" }}>
				<button
					type="button"
					onClick={() => navigate(`/challenges/${challenges[0]?.id}`)}
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
