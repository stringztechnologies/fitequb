import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Particle {
	id: number;
	x: number;
	delay: number;
	duration: number;
	color: string;
}

export function WinCelebration() {
	const navigate = useNavigate();
	const [particles, setParticles] = useState<Particle[]>([]);

	useEffect(() => {
		const colors = ["#FFD700", "#00C853", "#FF6B6B", "#E040FB", "#FFFFFF"];
		const ps: Particle[] = [];
		for (let i = 0; i < 30; i++) {
			ps.push({
				id: i,
				x: Math.random() * 100,
				delay: Math.random() * 2,
				duration: 2 + Math.random() * 3,
				color: colors[i % colors.length] ?? "#FFD700",
			});
		}
		setParticles(ps);
	}, []);

	return (
		<div className="relative min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 overflow-hidden">
			{/* Confetti particles */}
			{particles.map((p) => (
				<div
					key={p.id}
					className="absolute w-2 h-2 rounded-full"
					style={{
						left: `${p.x}%`,
						top: "-10px",
						backgroundColor: p.color,
						animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s infinite`,
						opacity: 0.8,
					}}
				/>
			))}

			{/* Confetti keyframes */}
			<style>
				{`@keyframes confetti-fall {
					0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
					100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
				}`}
			</style>

			{/* Logo */}
			<p className="text-[20px] font-bold text-[#FFD700] mb-8">FitEqub</p>

			{/* Trophy */}
			<div
				className="text-[80px] mb-4"
				style={{ filter: "drop-shadow(0 0 20px rgba(255,215,0,0.5))" }}
			>
				&#127942;
			</div>

			{/* Win text */}
			<h1 className="text-[34px] font-bold text-[#FFD700] mb-2">YOU WON!</h1>
			<p
				className="text-[46px] font-bold text-[#00E676] leading-none"
				style={{ textShadow: "0 0 30px rgba(0,230,118,0.5)" }}
			>
				25,000 ETB
			</p>

			<p className="text-[13px] text-[#8E8E93] text-center mt-4 max-w-[280px] leading-relaxed">
				Fitness pays off! Your payout is being transferred to your Telebirr account.
			</p>

			{/* Achievement badge */}
			<div className="mt-6 rounded-[12px] bg-[#1c1c1e] p-3 flex items-center gap-3">
				<svg
					viewBox="0 0 24 24"
					className="w-5 h-5 text-[#00C853]"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path d="M6.5 6.5h11M4 12h16" />
				</svg>
				<span className="text-[13px] text-white">Gym Sessions/Week — Completed</span>
			</div>

			{/* Actions */}
			<div className="w-full mt-8 space-y-3">
				<button
					type="button"
					onClick={() => navigate("/")}
					className="w-full py-4 rounded-[12px] bg-[#00C853] text-[#0a0a0a] text-[16px] font-bold shadow-[0_0_20px_rgba(0,200,83,0.4)] active:scale-[0.98] transition-transform"
				>
					Return to Home
				</button>
				<button
					type="button"
					className="w-full py-3.5 rounded-[12px] border border-[#FFD700] text-[#FFD700] text-[15px] font-semibold active:bg-[rgba(255,215,0,0.1)] transition-colors"
				>
					Share with Friends
				</button>
			</div>
		</div>
	);
}
