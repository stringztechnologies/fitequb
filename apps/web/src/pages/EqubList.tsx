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
		<div style={{ backgroundColor: "#0a0a0a", paddingBottom: "96px" }}>
			<div style={{ textAlign: "center", padding: "20px 16px 8px" }}>
				<h1 style={{ fontSize: "28px", fontWeight: 700, color: "#00C853" }}>FitEqub</h1>
				<p style={{ fontSize: "16px", color: "#FFFFFF", marginTop: "4px" }}>Equb Rooms</p>
			</div>

			<div style={{ padding: "0 16px 12px" }}>
				<button
					type="button"
					onClick={() => navigate("/equbs/create")}
					style={{
						width: "100%",
						padding: "12px",
						borderRadius: "12px",
						backgroundColor: "transparent",
						color: "#00C853",
						fontSize: "15px",
						fontWeight: 700,
						border: "2px solid #00C853",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "8px",
					}}
				>
					<svg
						viewBox="0 0 24 24"
						style={{ width: "18px", height: "18px" }}
						fill="none"
						stroke="#00C853"
						strokeWidth={2.5}
					>
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					Create New Equb
				</button>
			</div>

			<div
				style={{
					padding: "0 16px",
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
			>
				{rooms.length > 0 ? (
					rooms.map((r) => (
						<RealCard key={r.id} room={r} onClick={() => navigate(`/equbs/${r.id}`)} />
					))
				) : (
					<EmptyState
						title="No Equb Rooms Yet"
						description="Create a new Equb or wait for others to start one. Invite your friends to get started!"
					/>
				)}
			</div>
		</div>
	);
}

function EmptyState({ title, description }: { title: string; description: string }) {
	return (
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
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
				<circle cx="9" cy="7" r="4" />
				<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
				<path d="M16 3.13a4 4 0 0 1 0 7.75" />
			</svg>
			<h3 style={{ fontSize: "18px", fontWeight: 700, color: "#FFF", margin: "0 0 8px" }}>
				{title}
			</h3>
			<p style={{ fontSize: "14px", color: "#8E8E93", margin: 0, lineHeight: 1.5 }}>
				{description}
			</p>
		</div>
	);
}

function RealCard({ room, onClick }: { room: EqubRoom; onClick: () => void }) {
	const payout = room.stake_amount * room.max_members;
	const countdown = useCd(room.end_date);
	return (
		<button type="button" onClick={onClick} style={cardStyle}>
			<p
				style={{
					fontSize: "16px",
					fontWeight: 700,
					color: "#FFF",
					margin: 0,
					padding: "14px 16px 0",
				}}
			>
				{room.name}
			</p>
			<div
				style={{
					padding: "8px 16px 16px",
					display: "flex",
					justifyContent: "space-between",
				}}
			>
				<div>
					<p
						style={{
							fontSize: "15px",
							fontWeight: 700,
							color: "#FFF",
							margin: 0,
						}}
					>
						Entry:{" "}
						<span style={{ color: "#FFD700" }}>
							{room.stake_amount > 0 ? `${room.stake_amount} ETB` : "Free"}
						</span>
					</p>
					<p style={{ fontSize: "15px", color: "#FFF", margin: "2px 0 0" }}>
						Payout: <span style={{ color: "#FFD700" }}>{payout.toLocaleString()} ETB</span>
					</p>
				</div>
				{countdown && (
					<span
						style={{
							fontSize: "20px",
							fontWeight: 700,
							color: "#FFD700",
							fontFamily: "monospace",
						}}
					>
						{countdown}
					</span>
				)}
			</div>
		</button>
	);
}

const cardStyle: React.CSSProperties = {
	width: "100%",
	textAlign: "left",
	backgroundColor: "#1c1c1e",
	borderRadius: "16px",
	border: "1px solid rgba(255,255,255,0.1)",
	padding: 0,
	cursor: "pointer",
	overflow: "hidden",
};

function useCd(end: string): string | null {
	const [n, sn] = useState(Date.now());
	useEffect(() => {
		const t = setInterval(() => sn(Date.now()), 1000);
		return () => clearInterval(t);
	}, []);
	const d = new Date(end).getTime() - n;
	if (d <= 0) return null;
	const h = Math.floor(d / 3600000);
	const m = Math.floor((d % 3600000) / 60000);
	const s = Math.floor((d % 60000) / 1000);
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
