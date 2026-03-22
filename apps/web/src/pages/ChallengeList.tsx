import type { Challenge } from "@fitequb/shared";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

const DEMO_CHALLENGES = [
	{
		id: "c1",
		name: "Addis 100K",
		desc: "Walk 100,000 steps in 30 days",
		target: "100,000 steps",
		reward: "1GB Ethio Telecom data",
		sponsor: "Ethio Telecom",
		daysLeft: 25,
		participants: 342,
		icon: "hiking",
		color: "primary",
	},
	{
		id: "c2",
		name: "Morning Warrior",
		desc: "5,000 steps before 9am for 14 days",
		target: "5,000 steps/morning",
		reward: "500 ETB prize pool",
		sponsor: null,
		daysLeft: 10,
		participants: 128,
		icon: "wb_sunny",
		color: "secondary-container",
	},
	{
		id: "c3",
		name: "Gym Rat",
		desc: "12 gym check-ins in 30 days",
		target: "12 check-ins",
		reward: "Free month gym pass",
		sponsor: "Infinity Fitness",
		daysLeft: 22,
		participants: 89,
		icon: "fitness_center",
		color: "tertiary",
	},
];

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
		<div className="bg-surface min-h-screen pb-24 px-4 pt-5">
			{/* Header */}
			<div className="flex items-center gap-2 mb-6">
				<span
					className="material-symbols-outlined text-secondary-container text-2xl"
					style={{ fontVariationSettings: "'FILL' 1" }}
				>
					emoji_events
				</span>
				<h1 className="font-headline font-bold text-xl tracking-tight text-on-surface">Challenges</h1>
			</div>

			{/* Free entry callout */}
			<div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
				<div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
					<span
						className="material-symbols-outlined text-primary text-xl"
						style={{ fontVariationSettings: "'FILL' 1" }}
					>
						redeem
					</span>
				</div>
				<div>
					<p className="font-headline text-sm font-bold text-primary">FREE to Join</p>
					<p className="text-on-surface-variant text-xs">
						No stake required. Walk, earn, win real ETB prizes.
					</p>
				</div>
			</div>

			{/* Available Challenges */}
			<div className="mb-6">
				<h2 className="font-headline font-bold text-base text-on-surface mb-3 flex items-center gap-1.5">
					<span className="material-symbols-outlined text-primary text-lg">bolt</span>
					Available Challenges
				</h2>
				<div className="flex flex-col gap-3">
					{DEMO_CHALLENGES.map((ch) => (
						<ChallengeCard key={ch.id} challenge={ch} onJoin={() => navigate(`/challenges/${ch.id}`)} />
					))}
				</div>
			</div>

			{/* Leaderboard divider */}
			<div className="flex items-center gap-3 mb-4">
				<div className="flex-1 h-px bg-outline-variant/20" />
				<h2 className="font-headline font-bold text-base text-on-surface flex items-center gap-1.5 shrink-0">
					<span
						className="material-symbols-outlined text-secondary-container text-lg"
						style={{ fontVariationSettings: "'FILL' 1" }}
					>
						leaderboard
					</span>
					Weekly Leaderboard
				</h2>
				<div className="flex-1 h-px bg-outline-variant/20" />
			</div>

			{/* Podium */}
			<div className="flex items-end justify-center gap-3 mb-6 pt-4">
				<PodiumCard name="Dawit K." steps="48,200" etb="3,750" rank={2} />
				<PodiumCard name="Abeba T." steps="50,000" etb="7,500" rank={1} crown />
				<PodiumCard name="Sara M." steps="45,200" etb="1,875" rank={3} />
			</div>

			{/* Leaderboard List (4th+) */}
			<div className="flex flex-col gap-2 mb-6">
				{DEMO_LEADERS.slice(3).map((l, i) => {
					const isYou = l.name === "Zemzem A.";
					return (
						<div
							key={l.name}
							className={`bg-surface-container-low rounded-xl p-4 flex items-center gap-4 ${
								isYou ? "ring-1 ring-primary/30 bg-primary/5" : ""
							}`}
						>
							<span className="font-label text-sm text-on-surface-variant w-4 text-center">
								{i + 4}
							</span>
							<div
								className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
									isYou ? "bg-primary/20 ring-2 ring-primary" : "bg-surface-container-highest"
								}`}
							>
								<span className="font-body font-bold text-sm text-on-surface">
									{l.name.charAt(0)}
								</span>
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-1.5">
									<p className="font-body font-bold text-sm text-on-surface truncate">{l.name}</p>
									{isYou && (
										<span className="font-label text-[9px] font-bold text-on-primary bg-primary px-1.5 py-0.5 rounded">
											YOU
										</span>
									)}
								</div>
								<p className="font-label text-[10px] text-on-surface-variant">
									{l.steps.toLocaleString()} steps
								</p>
							</div>
							<span className="font-label font-bold text-primary text-xs whitespace-nowrap">
								{l.etb.toLocaleString()} ETB
							</span>
						</div>
					);
				})}
			</div>

			{/* CTA Button */}
			<button
				type="button"
				onClick={() => {
					if (hasReal) {
						navigate(`/challenges/${challenges[0]?.id}`);
					}
				}}
				className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-4 rounded-full font-body font-bold text-sm tracking-wide shadow-[0_10px_30px_rgba(0,200,83,0.3)] active:scale-[0.98] transition-transform"
			>
				UPDATE MY STEPS
			</button>
		</div>
	);
}

function ChallengeCard({
	challenge,
	onJoin,
}: {
	challenge: (typeof DEMO_CHALLENGES)[number];
	onJoin: () => void;
}) {
	const iconBgMap: Record<string, string> = {
		primary: "bg-primary/15 text-primary",
		"secondary-container": "bg-secondary-container/15 text-secondary-container",
		tertiary: "bg-tertiary/15 text-tertiary",
	};
	const iconClasses = iconBgMap[challenge.color] ?? "bg-primary/15 text-primary";

	return (
		<div className="bg-surface-container-low rounded-lg p-5 border border-outline-variant/10">
			<div className="flex items-start gap-3.5">
				{/* Icon */}
				<div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconClasses}`}>
					<span className="material-symbols-outlined text-xl">{challenge.icon}</span>
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-0.5">
						<h3 className="font-headline text-base font-bold text-on-surface truncate">
							{challenge.name}
						</h3>
						{challenge.sponsor && (
							<span className="bg-secondary-container/10 text-secondary-container font-label text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
								<span
									className="material-symbols-outlined text-[10px]"
									style={{ fontVariationSettings: "'FILL' 1", fontSize: "10px" }}
								>
									verified
								</span>
								{challenge.sponsor}
							</span>
						)}
					</div>
					<p className="text-on-surface-variant text-xs mb-3">{challenge.desc}</p>

					{/* Meta row */}
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3">
						<span className="flex items-center gap-1 text-on-surface-variant font-label text-[10px]">
							<span className="material-symbols-outlined text-xs">flag</span>
							{challenge.target}
						</span>
						<span className="flex items-center gap-1 text-on-surface-variant font-label text-[10px]">
							<span
								className="material-symbols-outlined text-xs text-primary"
								style={{ fontVariationSettings: "'FILL' 1" }}
							>
								card_giftcard
							</span>
							{challenge.reward}
						</span>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<span className="flex items-center gap-1 text-on-surface-variant font-label text-[10px]">
								<span className="material-symbols-outlined text-xs">group</span>
								{challenge.participants}
							</span>
							<span className="flex items-center gap-1 text-on-surface-variant font-label text-[10px]">
								<span className="material-symbols-outlined text-xs">schedule</span>
								{challenge.daysLeft}d left
							</span>
						</div>

						<button
							type="button"
							onClick={onJoin}
							className="border border-primary text-primary rounded-full px-4 py-2 font-label text-xs font-bold active:scale-[0.97] transition-transform"
						>
							Join Challenge
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function PodiumCard({
	name,
	steps,
	etb,
	rank,
	crown,
}: {
	name: string;
	steps: string;
	etb: string;
	rank: number;
	crown?: boolean;
}) {
	const heightClass = rank === 1 ? "h-[180px]" : rank === 2 ? "h-[140px]" : "h-[110px]";
	const avatarSize = rank === 1 ? "w-16 h-16" : rank === 2 ? "w-14 h-14" : "w-12 h-12";
	const avatarTextSize = rank === 1 ? "text-xl" : "text-lg";
	const rankBg =
		rank === 1
			? "bg-secondary-container text-on-secondary-container"
			: rank === 2
				? "bg-surface-container-highest text-on-surface"
				: "bg-surface-container-highest text-on-surface";
	const borderGradient =
		rank === 1
			? "from-secondary-container to-secondary-container/60"
			: rank === 2
				? "from-on-surface-variant to-on-surface-variant/40"
				: "from-[#CD7F32] to-[#CD7F32]/40";
	const prizeColor = rank === 1 ? "text-secondary-container" : "text-primary";

	return (
		<div className={`flex flex-col items-center ${rank === 1 ? "w-[120px] -mt-4" : "w-[100px]"}`}>
			{/* Avatar with gradient border */}
			<div className="relative mb-2">
				{crown && (
					<span
						className="material-symbols-outlined absolute -top-5 left-1/2 -translate-x-1/2 text-secondary-container text-2xl"
						style={{ fontVariationSettings: "'FILL' 1" }}
					>
						workspace_premium
					</span>
				)}
				<div className={`${avatarSize} rounded-full p-[3px] bg-gradient-to-b ${borderGradient}`}>
					<div className="w-full h-full rounded-full bg-surface-container-low flex items-center justify-center">
						<span className={`font-headline font-bold ${avatarTextSize} text-on-surface`}>
							{name.charAt(0)}
						</span>
					</div>
				</div>
				{/* Rank badge */}
				<div
					className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${rankBg} text-[10px] font-bold font-label ring-2 ring-surface`}
				>
					{rank}
				</div>
			</div>

			{/* Name */}
			<p className="font-body font-bold text-xs text-on-surface text-center mt-1">{name}</p>

			{/* Steps */}
			<p className="font-label text-[10px] text-primary mt-0.5">{steps} steps</p>

			{/* Prize */}
			<p className={`font-headline ${prizeColor} font-bold text-xs mt-0.5`}>{etb} ETB</p>

			{/* Pedestal */}
			<div
				className={`w-full ${heightClass} rounded-t-xl bg-gradient-to-b from-surface-container-low to-surface-container-lowest mt-2 flex items-start justify-center pt-3 border border-b-0 border-secondary-container/10`}
			>
				<span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
					{rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}
				</span>
			</div>
		</div>
	);
}
