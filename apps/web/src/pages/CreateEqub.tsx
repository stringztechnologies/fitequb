import {
	EQUB_DEFAULT_COMPLETION_PCT,
	EQUB_DEFAULT_DURATION_DAYS,
	EQUB_MAX_MEMBERS,
	EQUB_MIN_MEMBERS,
} from "@fitequb/shared";
import type { EqubRoom } from "@fitequb/shared";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

export function CreateEqub() {
	const navigate = useNavigate();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [members, setMembers] = useState(10);
	const [payout, setPayout] = useState("25000");

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		const form = new FormData(e.currentTarget);
		const durationDays = Number(form.get("duration_days")) || EQUB_DEFAULT_DURATION_DAYS;
		const startDate = new Date();
		startDate.setDate(startDate.getDate() + 1);

		const res = await api<EqubRoom>("/api/equb-rooms", {
			method: "POST",
			body: JSON.stringify({
				name: form.get("name"),
				stake_amount: Number(form.get("stake_amount")),
				duration_days: durationDays,
				workout_target: Number(form.get("workout_target")) || durationDays,
				completion_pct: EQUB_DEFAULT_COMPLETION_PCT,
				min_members: EQUB_MIN_MEMBERS,
				max_members: members,
				start_date: startDate.toISOString(),
				sponsor_prize: 0,
			}),
		});
		setSubmitting(false);
		if (res.error) {
			setError(res.error);
			return;
		}
		if (res.data) navigate(`/equbs/${res.data.id}`);
	}

	const entryEstimate = Number(payout) > 0 ? Math.round(Number(payout) / members) : 0;

	return (
		<div style={{ backgroundColor: "#0a0a0a", paddingBottom: "96px" }}>
			{/* Header with cancel + title */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "16px",
				}}
			>
				<button
					type="button"
					onClick={() => navigate(-1)}
					style={{
						fontSize: "16px",
						color: "#8E8E93",
						background: "none",
						border: "none",
						cursor: "pointer",
					}}
				>
					Cancel
				</button>
				<h1
					style={{
						fontSize: "18px",
						fontWeight: 700,
						color: "#FFF",
						margin: 0,
					}}
				>
					Create New Equb: Basics
				</h1>
				<div style={{ width: "50px" }} />
			</div>

			{/* Step indicator */}
			<div
				style={{
					padding: "0 16px 16px",
					display: "flex",
					alignItems: "center",
					gap: "8px",
				}}
			>
				<div
					style={{
						flex: 1,
						height: "3px",
						borderRadius: "2px",
						backgroundColor: "#00C853",
					}}
				/>
				<div
					style={{
						flex: 1,
						height: "3px",
						borderRadius: "2px",
						backgroundColor: "#2c2c2e",
					}}
				/>
				<div
					style={{
						flex: 1,
						height: "3px",
						borderRadius: "2px",
						backgroundColor: "#2c2c2e",
					}}
				/>
				<span style={{ fontSize: "14px", color: "#FFF", marginLeft: "4px" }}>1/3: Basics</span>
			</div>

			<form onSubmit={handleSubmit} style={{ padding: "0 16px" }}>
				{/* Equb Name */}
				<div style={{ marginBottom: "16px" }}>
					<label
						style={{
							fontSize: "14px",
							color: "#8E8E93",
							display: "block",
							marginBottom: "6px",
						}}
						htmlFor="equb-name"
					>
						Equb Name
					</label>
					<input
						name="name"
						type="text"
						required
						placeholder="e.g. Morning Movers"
						style={inputStyle}
					/>
				</div>

				{/* Target Payout */}
				<div style={{ marginBottom: "16px" }}>
					<label
						style={{
							fontSize: "14px",
							color: "#8E8E93",
							display: "block",
							marginBottom: "6px",
						}}
						htmlFor="target-payout"
					>
						Target Payout
					</label>
					<input
						name="stake_amount"
						type="number"
						required
						value={payout}
						onChange={(e) => setPayout(e.target.value)}
						style={{ ...inputStyle, color: "#FFD700", fontWeight: 700 }}
					/>
				</div>

				{/* Number of Participants — slider */}
				<div style={{ marginBottom: "16px" }}>
					<label
						style={{
							fontSize: "14px",
							color: "#8E8E93",
							display: "block",
							marginBottom: "6px",
						}}
						htmlFor="num-participants"
					>
						Number of Participants
					</label>
					<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
						<span style={{ fontSize: "12px", color: "#8E8E93" }}>{EQUB_MIN_MEMBERS}</span>
						<input
							type="range"
							min={EQUB_MIN_MEMBERS}
							max={EQUB_MAX_MEMBERS}
							value={members}
							onChange={(e) => setMembers(Number(e.target.value))}
							style={{ flex: 1, accentColor: "#FFD700" }}
						/>
						<span style={{ fontSize: "12px", color: "#8E8E93" }}>{EQUB_MAX_MEMBERS}</span>
					</div>
					<p
						style={{
							fontSize: "16px",
							fontWeight: 700,
							color: "#00C853",
							textAlign: "center",
							margin: "8px 0 0",
						}}
					>
						{members}
					</p>
				</div>

				{/* Duration */}
				<div style={{ marginBottom: "16px" }}>
					<label
						style={{
							fontSize: "14px",
							color: "#8E8E93",
							display: "block",
							marginBottom: "6px",
						}}
						htmlFor="duration"
					>
						Duration (days)
					</label>
					<input name="duration_days" type="number" defaultValue="30" style={inputStyle} />
				</div>

				{/* Workout Target */}
				<div style={{ marginBottom: "16px" }}>
					<label
						style={{
							fontSize: "14px",
							color: "#8E8E93",
							display: "block",
							marginBottom: "6px",
						}}
						htmlFor="workout-target"
					>
						Workout Target (days)
					</label>
					<input name="workout_target" type="number" placeholder="30" style={inputStyle} />
				</div>

				{/* Fitness Requirement dropdown */}
				<div
					style={{
						marginBottom: "16px",
						border: "1px solid #00C853",
						borderRadius: "10px",
						padding: "14px 16px",
					}}
				>
					<p
						style={{
							fontSize: "16px",
							color: "#FFF",
							margin: 0,
							fontWeight: 500,
						}}
					>
						Fitness Requirement
					</p>
					<div
						style={{
							marginTop: "8px",
							display: "flex",
							flexDirection: "column",
							gap: "8px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<span style={{ color: "#00C853" }}>&#10003;</span>
							<span style={{ fontSize: "15px", color: "#FFF" }}>10k Steps/Day</span>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<span style={{ color: "#FF9500" }}>&#10003;</span>
							<span style={{ fontSize: "15px", color: "#FFF" }}>3 Gym Visits/Week</span>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<span style={{ color: "#00C853" }}>&#10003;</span>
							<span style={{ fontSize: "15px", color: "#FFF" }}>5km Run/Week</span>
						</div>
					</div>
				</div>

				{/* Rule Summary Card */}
				<div
					style={{
						border: "1px solid #00C853",
						borderRadius: "12px",
						padding: "16px",
						marginBottom: "24px",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "8px",
						}}
					>
						<span style={{ fontSize: "16px", fontWeight: 700, color: "#FFF" }}>Rule Summary</span>
						<span style={{ fontSize: "12px", color: "#8E8E93" }}>Updates in real-time</span>
					</div>
					<p style={{ fontSize: "14px", color: "#8E8E93", margin: "0 0 4px" }}>
						Estimated Entry Fee per Person:
					</p>
					<p
						style={{
							fontSize: "28px",
							fontWeight: 700,
							color: "#00C853",
							margin: 0,
						}}
					>
						{entryEstimate.toLocaleString()} ETB
					</p>
				</div>

				{error && (
					<p style={{ color: "#FF3B30", fontSize: "14px", marginBottom: "12px" }}>{error}</p>
				)}

				{/* CTA */}
				<button
					type="submit"
					disabled={submitting}
					style={{
						width: "100%",
						padding: "16px",
						borderRadius: "12px",
						backgroundColor: "#00C853",
						color: "#0a0a0a",
						fontSize: "18px",
						fontWeight: 700,
						border: "none",
						cursor: "pointer",
						boxShadow: "0 0 20px rgba(0,200,83,0.3)",
						opacity: submitting ? 0.5 : 1,
					}}
				>
					{submitting ? "Creating..." : "Next: Set Rules"}
				</button>
			</form>
		</div>
	);
}

const inputStyle: React.CSSProperties = {
	width: "100%",
	padding: "14px 16px",
	backgroundColor: "#2c2c2e",
	border: "1px solid rgba(255,215,0,0.3)",
	borderRadius: "10px",
	color: "#FFF",
	fontSize: "16px",
	outline: "none",
	boxSizing: "border-box",
};
