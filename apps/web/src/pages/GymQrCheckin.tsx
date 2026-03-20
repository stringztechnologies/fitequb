import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function GymQrCheckin() {
	const { id: _id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [sessionNum] = useState(3);
	const [totalSessions] = useState(5);
	const pct = Math.round((sessionNum / totalSessions) * 100);

	return (
		<div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center px-6 pt-12 pb-8 relative">
			{/* Top icons */}
			<div className="absolute top-4 left-4">
				<svg
					viewBox="0 0 24 24"
					className="w-6 h-6 text-[#00C853]"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
				</svg>
			</div>
			<button
				type="button"
				onClick={() => navigate(-1)}
				className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#2c2c2e] flex items-center justify-center"
			>
				<svg
					viewBox="0 0 24 24"
					className="w-4 h-4 text-[#8E8E93]"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>

			{/* Title */}
			<h1 className="text-[26px] font-bold text-white text-center leading-tight mt-4 mb-8">
				Check-in at
				<br />
				Kuriftu Gym
			</h1>

			{/* QR Code container with green glow */}
			<div
				className="bg-white rounded-[16px] p-4 mb-6"
				style={{
					border: "3px solid #00C853",
					boxShadow: "0 0 30px rgba(0,200,83,0.4), 0 0 60px rgba(0,200,83,0.15)",
				}}
			>
				{/* Placeholder QR — in production use a QR library */}
				<div className="w-[200px] h-[200px] bg-white flex items-center justify-center">
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
			<p className="text-[20px] font-bold text-[#FFD700] text-center mb-8">
				Scan to confirm
				<br />
				your session
			</p>

			{/* Session progress */}
			<div className="w-full rounded-[12px] bg-[#1c1c1e] p-3.5">
				<div className="flex items-center justify-between mb-2">
					<span className="text-[13px] text-white">
						Session {sessionNum} of {totalSessions} this week
					</span>
					<span className="text-[13px] font-bold text-[#00C853]">{pct}%</span>
				</div>
				<div className="w-full h-[4px] rounded-full bg-[#2c2c2e] overflow-hidden">
					<div className="h-full rounded-full bg-[#00C853]" style={{ width: `${pct}%` }} />
				</div>
			</div>
		</div>
	);
}
