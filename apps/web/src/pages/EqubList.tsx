import type { EqubRoom } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

const DEMO_ROOMS = [
	{
		id: "demo-1",
		stake: 500,
		payout: 10000,
		max: 20,
		filled: 18,
		req: "10k Steps/Day",
		endMs: 2 * 3600000 + 45 * 60000,
		status: "active",
	},
	{
		id: "demo-2",
		stake: 1000,
		payout: 25000,
		max: 20,
		filled: 12,
		req: "5 Gym Sessions/Week",
		endMs: 8 * 3600000 + 12 * 60000,
		status: "active",
	},
	{
		id: "demo-3",
		stake: 250,
		payout: 5000,
		max: 15,
		filled: 8,
		req: "15k Steps/Day",
		endMs: 55 * 60000,
		status: "pending",
	},
];

export function EqubList() {
	const [rooms, setRooms] = useState<EqubRoom[]>([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		api<EqubRoom[]>("/api/equb-rooms")
			.then((res) => {
				if (res.data && res.data.length > 0) setRooms(res.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	const hasReal = rooms.length > 0;

	return (
		<div style={{ backgroundColor: "#0a0a0a", paddingBottom: "96px" }}>
			<div style={{ textAlign: "center", padding: "20px 16px 16px" }}>
				<h1 style={{ fontSize: "28px", fontWeight: 700, color: "#00C853" }}>FitEqub</h1>
				<p style={{ fontSize: "16px", color: "#FFFFFF", marginTop: "4px" }}>Equb Rooms</p>
			</div>

			<div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
				{hasReal
					? rooms.map((r) => (
							<RealCard key={r.id} room={r} onClick={() => navigate(`/equbs/${r.id}`)} />
						))
					: DEMO_ROOMS.map((r) => (
							<DemoCard key={r.id} room={r} onClick={() => navigate(`/equbs/${r.id}`)} />
						))}
			</div>
		</div>
	);
}

function DemoCard({ room, onClick }: { room: (typeof DEMO_ROOMS)[number]; onClick: () => void }) {
	const end = new Date(Date.now() + room.endMs).toISOString();
	const countdown = useCd(end);
	const fillPct = Math.round((room.filled / room.max) * 100);

	return (
		<button type="button" onClick={onClick} style={cardStyle}>
			<div
				style={{
					padding: "16px 16px 8px",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					gap: "12px",
				}}
			>
				<div
					style={{
						backgroundColor: "#2c2c2e",
						border: "1px solid rgba(255,215,0,0.3)",
						borderRadius: "8px",
						padding: "8px 12px",
					}}
				>
					<p style={{ fontSize: "15px", fontWeight: 700, color: "#FFF", margin: 0 }}>
						Entry: <span style={{ color: "#FFD700" }}>{room.stake} ETB</span>
					</p>
					<p style={{ fontSize: "15px", fontWeight: 700, color: "#FFF", margin: "2px 0 0" }}>
						Payout: <span style={{ color: "#FFD700" }}>{room.payout.toLocaleString()} ETB</span>
					</p>
				</div>
				{countdown ? (
					<div style={{ textAlign: "right" }}>
						<p
							style={{
								fontSize: "10px",
								color: "#FF9500",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
								margin: 0,
							}}
						>
							Closes in
						</p>
						<p
							style={{
								fontSize: "24px",
								fontWeight: 700,
								color: cdColor(end),
								fontFamily: "monospace",
								fontVariantNumeric: "tabular-nums",
								margin: "2px 0 0",
							}}
						>
							{countdown}
						</p>
					</div>
				) : (
					<span
						style={{
							padding: "6px 16px",
							borderRadius: "8px",
							border: "1px solid #FFD700",
							color: "#FFD700",
							fontSize: "14px",
							fontWeight: 600,
						}}
					>
						Join Now
					</span>
				)}
			</div>
			<div style={{ padding: "4px 16px 8px", display: "flex", alignItems: "center", gap: "6px" }}>
				<span style={{ color: "#00C853", fontSize: "14px" }}>&#9679;</span>
				<span style={{ fontSize: "14px", color: "#FFF" }}>{room.req}</span>
			</div>
			<div style={{ padding: "0 16px 14px" }}>
				<p style={{ fontSize: "12px", color: "#8E8E93", margin: "0 0 4px" }}>
					{room.filled}/{room.max} spots filled
				</p>
				<div
					style={{
						width: "100%",
						height: "6px",
						backgroundColor: "#2c2c2e",
						borderRadius: "3px",
						overflow: "hidden",
					}}
				>
					<div
						style={{
							width: `${fillPct}%`,
							height: "100%",
							backgroundColor: "#00C853",
							borderRadius: "3px",
						}}
					/>
				</div>
			</div>
		</button>
	);
}

function RealCard({ room, onClick }: { room: EqubRoom; onClick: () => void }) {
	const payout = room.stake_amount * room.max_members;
	const countdown = useCd(room.end_date);
	return (
		<button type="button" onClick={onClick} style={cardStyle}>
			<div style={{ padding: "16px", display: "flex", justifyContent: "space-between" }}>
				<div>
					<p style={{ fontSize: "15px", fontWeight: 700, color: "#FFF", margin: 0 }}>
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
						style={{ fontSize: "20px", fontWeight: 700, color: "#FFD700", fontFamily: "monospace" }}
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

function cdColor(end: string): string {
	const d = new Date(end).getTime() - Date.now();
	if (d < 3600000) return "#FF3B30";
	if (d < 7200000) return "#FF9500";
	return "#FFD700";
}

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
