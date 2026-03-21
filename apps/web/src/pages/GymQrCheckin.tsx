import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function GymQrCheckin() {
	const { id: _id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [sessionNum] = useState(3);
	const [totalSessions] = useState(5);
	const pct = Math.round((sessionNum / totalSessions) * 100);

	return (
		<div className="min-h-screen bg-[#121619] flex flex-col items-center justify-between p-6">
			{/* Header */}
			<div className="flex justify-between items-center py-4 w-full">
				<svg
					viewBox="0 0 24 24"
					className="w-6 h-6 text-primary"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
				</svg>
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
				>
					<svg
						viewBox="0 0 24 24"
						className="w-4 h-4 text-on-surface-variant"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>

			{/* Center content */}
			<div className="flex flex-col items-center flex-1 justify-center gap-8">
				{/* Title */}
				<h1 className="font-headline text-4xl font-bold text-center leading-tight tracking-tight text-on-surface">
					Check-in at
					<br />
					Kuriftu Gym
				</h1>

				{/* QR Code container with neon glow */}
				<div className="border-3 border-primary rounded-[40px] shadow-[0_0_25px_rgba(0,200,83,0.4)] bg-[#1e2327] p-6">
					{/* Placeholder QR — in production use a QR library */}
					<div className="w-[200px] h-[200px] bg-white rounded-2xl flex items-center justify-center overflow-hidden">
						<svg viewBox="0 0 200 200" className="w-full h-full">
							{/* QR pattern placeholder */}
							{Array.from({ length: 20 }).map((_, row) =>
								Array.from({ length: 20 }).map((_, col) => {
									const key = `${row}-${col}`;
									const fill =
										(row * 7 + col * 13 + row * col) % 3 === 0 ||
										(row < 7 && col < 7) ||
										(row < 7 && col > 12) ||
										(row > 12 && col < 7)
											? "#000000"
											: "#FFFFFF";
									return (
										<rect key={key} x={col * 10} y={row * 10} width="10" height="10" fill={fill} />
									);
								}),
							)}
						</svg>
					</div>
				</div>

				{/* Scan instruction */}
				<p className="font-headline text-3xl font-bold text-secondary-container text-center tracking-tight">
					Scan to confirm
					<br />
					your session
				</p>
			</div>

			{/* Progress footer */}
			<div className="w-full border border-primary/50 rounded-2xl p-5 bg-black/10 backdrop-blur-sm">
				<div className="flex items-center justify-between mb-3">
					<span className="text-white/80 text-lg font-label">
						Session {sessionNum} of {totalSessions} this week
					</span>
					<span className="text-primary text-xl font-bold">{pct}%</span>
				</div>
				<div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
					<div
						className="h-full rounded-full bg-primary shadow-[0_0_10px_#00c853]"
						style={{ width: `${pct}%` }}
					/>
				</div>
			</div>
		</div>
	);
}
