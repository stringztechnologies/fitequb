import { useCallback, useState } from "react";

const STORAGE_KEY = "fitequb_onboarded";

const screens = [
	{
		title: "Stake",
		subtitle: "Put your money where your muscles are",
		description: "Stake 100-1,000 ETB to join a 30-day fitness challenge with your crew.",
		colorClass: "text-secondary-container",
		glowClass: "bg-secondary-container/30",
	},
	{
		title: "Sweat",
		subtitle: "Hit your daily targets",
		description: "Log steps, gym check-ins, or photo proof. Hit 80% of your goals to qualify.",
		colorClass: "text-primary",
		glowClass: "bg-primary/30",
	},
	{
		title: "Win",
		subtitle: "Your fitness literally pays you",
		description:
			"Complete the challenge and split the pot. Those who quit lose their stake to you.",
		colorClass: "text-secondary-container",
		glowClass: "bg-secondary-container/30",
	},
];

// SVG illustrations need raw hex values — pull from the design tokens
const svgColors = {
	gold: "#ffdb3c",
	goldLight: "#ffe16d",
	green: "#3fe56c",
	greenDark: "#006e2a",
	surface: "#201f1f",
	surfaceHigh: "#353534",
};

export function Onboarding() {
	const [current, setCurrent] = useState(0);
	const [direction, setDirection] = useState(0); // -1 left, 0 none, 1 right
	const isLast = current === screens.length - 1;
	const screen = screens[current]!;

	const complete = useCallback(() => {
		localStorage.setItem(STORAGE_KEY, "true");
		// Force a fresh page load to re-evaluate isOnboarded()
		window.location.href = "/";
	}, []);

	function goNext() {
		if (isLast) {
			complete();
			return;
		}
		setDirection(1);
		setTimeout(() => {
			setCurrent((c) => c + 1);
			setDirection(0);
		}, 200);
	}

	// Swipe support
	const [touchStart, setTouchStart] = useState(0);
	function handleTouchStart(e: React.TouchEvent) {
		setTouchStart(e.touches[0]?.clientX ?? 0);
	}
	function handleTouchEnd(e: React.TouchEvent) {
		const diff = (e.changedTouches[0]?.clientX ?? 0) - touchStart;
		if (diff < -50 && current < screens.length - 1) goNext();
		if (diff > 50 && current > 0) {
			setDirection(-1);
			setTimeout(() => {
				setCurrent((c) => c - 1);
				setDirection(0);
			}, 200);
		}
	}

	return (
		<div
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
			className="min-h-screen bg-background text-on-surface font-body flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
		>
			{/* Background glow */}
			<div
				className={`absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full pointer-events-none transition-all duration-500 ${screen.glowClass}`}
				style={{
					background: `radial-gradient(circle, currentColor 0%, transparent 70%)`,
				}}
			/>

			{/* Floating particles */}
			<FloatingParticles screenIndex={current} />

			{/* Skip */}
			{!isLast && (
				<button
					type="button"
					onClick={complete}
					className="absolute top-4 right-4 bg-transparent border-none text-on-surface-variant text-sm cursor-pointer px-3 py-2 z-10 font-label uppercase tracking-widest"
				>
					Skip
				</button>
			)}

			{/* Illustration -- animated SVG */}
			<div
				className="mb-8 transition-all duration-200 ease-out"
				style={{
					transform:
						direction === 1
							? "translateX(-100px)"
							: direction === -1
								? "translateX(100px)"
								: "translateX(0)",
					opacity: direction !== 0 ? 0 : 1,
				}}
			>
				{current === 0 && <CoinPotIllustration />}
				{current === 1 && <RunnerIllustration />}
				{current === 2 && <TrophyIllustration />}
			</div>

			{/* Title */}
			<h1
				className={`font-headline text-4xl font-extrabold tracking-tight text-center mb-2 transition-all duration-200 ease-out ${screen.colorClass}`}
				style={{
					transitionDelay: "0.05s",
					transform: direction !== 0 ? `translateX(${direction * -60}px)` : "translateX(0)",
					opacity: direction !== 0 ? 0 : 1,
				}}
			>
				{screen.title}
			</h1>

			{/* Subtitle */}
			<p
				className="font-headline text-lg font-semibold text-on-surface text-center mb-3 transition-all duration-200 ease-out"
				style={{
					transitionDelay: "0.1s",
					transform: direction !== 0 ? `translateX(${direction * -40}px)` : "translateX(0)",
					opacity: direction !== 0 ? 0 : 1,
				}}
			>
				{screen.subtitle}
			</p>

			{/* Description */}
			<p
				className="text-on-surface-variant text-[15px] leading-relaxed text-center mb-12 max-w-[300px] transition-all duration-200 ease-out"
				style={{
					transitionDelay: "0.15s",
					transform: direction !== 0 ? `translateX(${direction * -20}px)` : "translateX(0)",
					opacity: direction !== 0 ? 0 : 1,
				}}
			>
				{screen.description}
			</p>

			{/* Dot indicators */}
			<div className="flex gap-2 mb-7">
				{screens.map((s, i) => (
					<div
						key={s.title}
						className={`h-2 rounded-full transition-all duration-400 ${
							i === current
								? `w-7 ${current === 1 ? "bg-primary shadow-glow" : "bg-secondary-container shadow-glow-gold"}`
								: "w-2 bg-surface-container-highest"
						}`}
					/>
				))}
			</div>

			{/* Action button -- gradient shimmer */}
			<button
				type="button"
				onClick={goNext}
				className="w-full max-w-[320px] py-4 rounded-full border-none bg-gradient-to-r from-primary to-secondary-container text-on-primary text-[17px] font-headline font-bold cursor-pointer shadow-glow-strong relative z-[5] animate-shimmer"
				style={{
					backgroundSize: "200% 200%",
				}}
			>
				{isLast ? "Get Started" : "Next"}
			</button>

			{/* Shimmer animation */}
			<style>
				{`@keyframes shimmer {
					0% { background-position: 0% 50%; }
					50% { background-position: 100% 50%; }
					100% { background-position: 0% 50%; }
				}
				.animate-shimmer { animation: shimmer 3s ease infinite; }`}
			</style>
		</div>
	);
}

export function isOnboarded(): boolean {
	return localStorage.getItem(STORAGE_KEY) === "true";
}

// -- Floating Particles --

function FloatingParticles({ screenIndex }: { screenIndex: number }) {
	const color = screenIndex === 1 ? svgColors.green : svgColors.gold;
	const [particles] = useState(() =>
		Array.from({ length: 12 }, (_, i) => ({
			id: i,
			x: 10 + Math.random() * 80,
			size: 2 + Math.random() * 4,
			delay: Math.random() * 5,
			duration: 4 + Math.random() * 4,
			opacity: 0.1 + Math.random() * 0.3,
		})),
	);

	return (
		<div className="absolute inset-0 pointer-events-none overflow-hidden">
			{particles.map((p) => (
				<div
					key={p.id}
					className="absolute rounded-full"
					style={{
						left: `${p.x}%`,
						bottom: "-10px",
						width: `${p.size}px`,
						height: `${p.size}px`,
						backgroundColor: color,
						opacity: p.opacity,
						animation: `float-up ${p.duration}s ease-in-out ${p.delay}s infinite`,
					}}
				/>
			))}
			<style>
				{`@keyframes float-up {
					0% { transform: translateY(0); opacity: 0; }
					20% { opacity: var(--particle-opacity, 0.3); }
					100% { transform: translateY(-100vh); opacity: 0; }
				}`}
			</style>
		</div>
	);
}

// -- Animated SVG Illustrations (120px+) --

function CoinPotIllustration() {
	return (
		<svg width="180" height="180" viewBox="0 0 180 180" fill="none">
			{/* Pot glow */}
			<ellipse cx="90" cy="140" rx="50" ry="8" fill="rgba(255,219,60,0.1)" />
			{/* Pot body */}
			<path
				d="M55 90 C55 90 48 135 55 135 L125 135 C132 135 125 90 125 90 Z"
				fill={svgColors.surface}
				stroke={svgColors.surfaceHigh}
				strokeWidth="2"
			/>
			<ellipse cx="90" cy="90" rx="35" ry="10" fill={svgColors.surfaceHigh} />
			{/* Animated coins */}
			<g style={{ animation: "coin-fall-1 2s ease-in-out infinite" }}>
				<ellipse cx="70" cy="35" rx="14" ry="5" fill={svgColors.gold} />
				<ellipse cx="70" cy="33" rx="14" ry="5" fill={svgColors.goldLight} opacity="0.5" />
				<text x="70" y="38" textAnchor="middle" fontSize="7" fill="#8B6914" fontWeight="bold">
					ETB
				</text>
			</g>
			<g style={{ animation: "coin-fall-2 2.5s ease-in-out 0.3s infinite" }}>
				<ellipse cx="105" cy="20" rx="14" ry="5" fill={svgColors.gold} />
				<ellipse cx="105" cy="18" rx="14" ry="5" fill={svgColors.goldLight} opacity="0.5" />
				<text x="105" y="23" textAnchor="middle" fontSize="7" fill="#8B6914" fontWeight="bold">
					ETB
				</text>
			</g>
			<g style={{ animation: "coin-fall-3 2.2s ease-in-out 0.6s infinite" }}>
				<ellipse cx="85" cy="55" rx="14" ry="5" fill={svgColors.gold} />
				<ellipse cx="85" cy="53" rx="14" ry="5" fill={svgColors.goldLight} opacity="0.5" />
				<text x="85" y="58" textAnchor="middle" fontSize="7" fill="#8B6914" fontWeight="bold">
					ETB
				</text>
			</g>
			{/* Sparkles */}
			<circle
				cx="45"
				cy="60"
				r="2"
				fill={svgColors.gold}
				opacity="0.6"
				style={{ animation: "sparkle 1.5s ease infinite" }}
			/>
			<circle
				cx="135"
				cy="55"
				r="2.5"
				fill={svgColors.gold}
				opacity="0.5"
				style={{ animation: "sparkle 1.8s ease 0.5s infinite" }}
			/>
			<style>
				{`@keyframes coin-fall-1 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
				@keyframes coin-fall-2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(12px); } }
				@keyframes coin-fall-3 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
				@keyframes sparkle { 0%,100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.5); } }`}
			</style>
		</svg>
	);
}

function RunnerIllustration() {
	return (
		<svg width="180" height="180" viewBox="0 0 180 180" fill="none">
			{/* Ground with glow */}
			<line x1="20" y1="150" x2="160" y2="150" stroke={svgColors.surface} strokeWidth="2" />
			<ellipse cx="90" cy="150" rx="50" ry="4" fill="rgba(63,229,108,0.08)" />
			{/* Running person -- animated */}
			<g style={{ animation: "runner-bounce 1s ease-in-out infinite" }}>
				{/* Head */}
				<circle cx="95" cy="40" r="13" fill={svgColors.green} />
				<circle cx="95" cy="40" r="13" fill="url(#headGrad)" />
				{/* Body */}
				<line
					x1="95"
					y1="53"
					x2="88"
					y2="88"
					stroke={svgColors.green}
					strokeWidth="4"
					strokeLinecap="round"
				/>
				{/* Arms */}
				<line
					x1="90"
					y1="65"
					x2="70"
					y2="58"
					stroke={svgColors.green}
					strokeWidth="4"
					strokeLinecap="round"
				/>
				<line
					x1="90"
					y1="65"
					x2="110"
					y2="75"
					stroke={svgColors.green}
					strokeWidth="4"
					strokeLinecap="round"
				/>
				{/* Legs */}
				<line
					x1="88"
					y1="88"
					x2="70"
					y2="115"
					stroke={svgColors.green}
					strokeWidth="4"
					strokeLinecap="round"
				/>
				<line
					x1="70"
					y1="115"
					x2="58"
					y2="148"
					stroke={svgColors.green}
					strokeWidth="4"
					strokeLinecap="round"
				/>
				<line
					x1="88"
					y1="88"
					x2="108"
					y2="110"
					stroke={svgColors.green}
					strokeWidth="4"
					strokeLinecap="round"
				/>
				<line
					x1="108"
					y1="110"
					x2="120"
					y2="148"
					stroke={svgColors.green}
					strokeWidth="4"
					strokeLinecap="round"
				/>
			</g>
			{/* Sweat drops -- animated */}
			<circle
				cx="115"
				cy="38"
				r="3"
				fill="#4FC3F7"
				style={{ animation: "sweat-drop 1.5s ease-in infinite" }}
			/>
			<circle
				cx="120"
				cy="50"
				r="2"
				fill="#4FC3F7"
				style={{ animation: "sweat-drop 1.5s ease-in 0.3s infinite" }}
			/>
			{/* Motion lines */}
			<line
				x1="40"
				y1="65"
				x2="55"
				y2="65"
				stroke={svgColors.green}
				strokeWidth="2"
				opacity="0.3"
				style={{ animation: "motion-line 0.8s ease infinite" }}
			/>
			<line
				x1="35"
				y1="78"
				x2="52"
				y2="78"
				stroke={svgColors.green}
				strokeWidth="2"
				opacity="0.25"
				style={{ animation: "motion-line 0.8s ease 0.2s infinite" }}
			/>
			<line
				x1="38"
				y1="91"
				x2="50"
				y2="91"
				stroke={svgColors.green}
				strokeWidth="2"
				opacity="0.2"
				style={{ animation: "motion-line 0.8s ease 0.4s infinite" }}
			/>
			<defs>
				<radialGradient id="headGrad">
					<stop offset="30%" stopColor="#00E676" />
					<stop offset="100%" stopColor={svgColors.green} />
				</radialGradient>
			</defs>
			<style>
				{`@keyframes runner-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
				@keyframes sweat-drop { 0% { transform: translateY(0); opacity: 0.8; } 100% { transform: translateY(20px); opacity: 0; } }
				@keyframes motion-line { 0%,100% { opacity: 0.1; transform: translateX(0); } 50% { opacity: 0.4; transform: translateX(-5px); } }`}
			</style>
		</svg>
	);
}

function TrophyIllustration() {
	return (
		<svg width="180" height="180" viewBox="0 0 180 180" fill="none">
			{/* Trophy glow */}
			<ellipse cx="90" cy="130" rx="45" ry="8" fill="rgba(255,219,60,0.15)" />
			{/* Trophy body */}
			<g style={{ animation: "trophy-pulse 2s ease-in-out infinite" }}>
				<path
					d="M65 50 L65 30 L115 30 L115 50 C115 75 100 95 90 100 C80 95 65 75 65 50Z"
					fill="url(#trophyGrad)"
					stroke="#E6C200"
					strokeWidth="2"
				/>
				{/* Handles */}
				<path
					d="M65 42 C52 42 47 55 53 68 L65 62"
					stroke={svgColors.gold}
					strokeWidth="3.5"
					fill="none"
					strokeLinecap="round"
				/>
				<path
					d="M115 42 C128 42 133 55 127 68 L115 62"
					stroke={svgColors.gold}
					strokeWidth="3.5"
					fill="none"
					strokeLinecap="round"
				/>
				{/* Stem + base */}
				<rect x="84" y="100" width="12" height="16" rx="2" fill="#E6C200" />
				<rect x="70" y="116" width="40" height="8" rx="3" fill={svgColors.gold} />
				{/* Star */}
				<polygon
					points="90,42 94,54 106,54 96,62 100,74 90,66 80,74 84,62 74,54 86,54"
					fill="#FFF8DC"
					opacity="0.9"
				/>
			</g>
			{/* Money bills -- floating */}
			<g style={{ animation: "bill-float-1 3s ease-in-out infinite" }}>
				<rect
					x="25"
					y="65"
					width="32"
					height="18"
					rx="3"
					fill={svgColors.green}
					transform="rotate(-15 41 74)"
				/>
				<text
					x="41"
					y="78"
					textAnchor="middle"
					fontSize="8"
					fill={svgColors.greenDark}
					fontWeight="bold"
					transform="rotate(-15 41 74)"
				>
					ETB
				</text>
			</g>
			<g style={{ animation: "bill-float-2 3.5s ease-in-out 0.5s infinite" }}>
				<rect
					x="120"
					y="68"
					width="32"
					height="18"
					rx="3"
					fill={svgColors.green}
					transform="rotate(10 136 77)"
				/>
				<text
					x="136"
					y="81"
					textAnchor="middle"
					fontSize="8"
					fill={svgColors.greenDark}
					fontWeight="bold"
					transform="rotate(10 136 77)"
				>
					ETB
				</text>
			</g>
			{/* Sparkles */}
			<circle
				cx="45"
				cy="25"
				r="3"
				fill={svgColors.gold}
				style={{ animation: "sparkle 1.5s ease infinite" }}
			/>
			<circle
				cx="135"
				cy="22"
				r="3.5"
				fill={svgColors.gold}
				style={{ animation: "sparkle 1.8s ease 0.5s infinite" }}
			/>
			<circle
				cx="30"
				cy="50"
				r="2"
				fill={svgColors.gold}
				style={{ animation: "sparkle 2s ease 1s infinite" }}
			/>
			<circle
				cx="150"
				cy="45"
				r="2"
				fill={svgColors.gold}
				style={{ animation: "sparkle 1.6s ease 0.3s infinite" }}
			/>
			<defs>
				<linearGradient id="trophyGrad" x1="65" y1="30" x2="115" y2="100">
					<stop offset="0%" stopColor={svgColors.goldLight} />
					<stop offset="100%" stopColor={svgColors.gold} />
				</linearGradient>
			</defs>
			<style>
				{`@keyframes trophy-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
				@keyframes bill-float-1 { 0%,100% { transform: translateY(0) rotate(-15deg); } 50% { transform: translateY(-8px) rotate(-12deg); } }
				@keyframes bill-float-2 { 0%,100% { transform: translateY(0) rotate(10deg); } 50% { transform: translateY(-10px) rotate(13deg); } }
				@keyframes sparkle { 0%,100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.5); } }`}
			</style>
		</svg>
	);
}
