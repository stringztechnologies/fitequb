import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

interface ProfileSummary {
	total_points: number;
	level: {
		level: number;
		name: string;
		min_points: number;
		perk: string | null;
	};
	next_level: { level: number; name: string; min_points: number } | null;
	points_to_next: number;
}

export function Home() {
	const { user, loading } = useAuth();
	const [profile, setProfile] = useState<ProfileSummary | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		api<ProfileSummary>("/api/gamification/profile").then((res) => {
			if (res.data) setProfile(res.data);
		});
	}, []);

	if (loading) return <Loading />;

	const progressPct = profile?.next_level
		? Math.min(
				100,
				((profile.total_points - profile.level.min_points) /
					(profile.next_level.min_points - profile.level.min_points)) *
					100,
			)
		: 75;

	const circ = 2 * Math.PI * 80;
	const displayAmount = profile?.total_points ?? 12500;

	const isDemo = !profile;

	return (
		<div className="bg-background text-on-surface font-body pb-24">
			{/* Header */}
			<header className="fixed top-0 w-full z-50 bg-[#131313]/70 backdrop-blur-xl flex justify-between items-center px-5 h-16">
				<h1 className="text-xl font-headline font-bold tracking-tight text-primary-container">
					FitEqub
				</h1>
				<div className="flex items-center gap-1 bg-secondary-container/15 px-2.5 py-1 rounded-full">
					<span className="text-sm">🔥</span>
					<span className="text-sm font-bold text-secondary-container">7</span>
				</div>
			</header>

			{/* Spacer for fixed header */}
			<div className="h-16" />

			{/* Demo banner */}
			{isDemo && (
				<div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-secondary-container/12 border border-secondary-container/30">
					<p className="text-xs text-secondary-container font-medium">
						Demo Mode — Sign in via Telegram to see your real data
					</p>
				</div>
			)}

			{/* Tagline */}
			<div className="px-5 pt-6 pb-2">
				<p className="text-on-surface-variant text-sm font-body">
					{user ? `Welcome, ${user.full_name}` : "Stake. Sweat. Split the pot."}
				</p>
			</div>

			{/* Progress Ring Section */}
			<div className="mx-5 mt-4 bg-surface-container-low rounded-lg p-6 text-center">
				{/* Payout label */}
				<p className="font-label text-2xs uppercase tracking-[0.2em] text-on-surface-variant mb-4">
					Your Progress
				</p>

				{/* SVG Ring */}
				<div className="flex justify-center">
					<div className="relative w-[200px] h-[200px] drop-shadow-[0_0_20px_rgba(63,229,108,0.5)]">
						<svg
							viewBox="0 0 200 200"
							className="w-full h-full -rotate-90"
						>
							<circle
								cx="100"
								cy="100"
								r="80"
								fill="none"
								className="stroke-surface-container-highest"
								strokeWidth="8"
							/>
							<circle
								cx="100"
								cy="100"
								r="80"
								fill="none"
								className="stroke-primary"
								strokeWidth="8"
								strokeLinecap="round"
								strokeDasharray={`${(progressPct / 100) * circ} ${circ}`}
							/>
						</svg>

						{/* Center text */}
						<div className="absolute inset-0 flex flex-col items-center justify-center">
							<span className="font-headline text-4xl font-extrabold text-white">
								{displayAmount.toLocaleString()}
								<span className="font-label text-sm text-primary font-bold ml-1">
									ETB
								</span>
							</span>
							<span className="font-label text-xs text-secondary-container mt-1">
								Potential Payout
							</span>
							<span className="font-label text-2xs text-on-surface-variant mt-1.5">
								18/25 days completed
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Feature Cards */}
			<div className="grid grid-cols-1 gap-5 px-5 pt-5">
				<FeatureCard
					title="Equb Rooms"
					subtitle="Join a fitness accountability group"
					badgeText="Ends in 2 days"
					badgeGreen={false}
					icon="groups"
					progress={65}
					onClick={() => navigate("/equbs")}
				/>
				<FeatureCard
					title="Gym Day Passes"
					subtitle="Discounted single-visit passes"
					badgeText="Discount Active"
					badgeGreen
					icon="fitness_center"
					progress={40}
					onClick={() => navigate("/gyms")}
				/>
				<FeatureCard
					title="Step Challenge"
					subtitle="Compete on the city leaderboard"
					badgeText="15,450 Steps"
					badgeGreen
					icon="directions_walk"
					progress={80}
					variant="challenge"
					onClick={() => navigate("/challenges")}
				/>
			</div>

			{/* Create Equb FAB */}
			<button
				type="button"
				onClick={() => navigate("/equbs/create")}
				className="fixed bottom-32 right-6 w-16 h-16 bg-primary text-on-primary-container rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-40 active:scale-95 transition-transform"
			>
				<span className="material-symbols-outlined text-3xl">add</span>
			</button>
		</div>
	);
}

function FeatureCard({
	title,
	subtitle,
	badgeText,
	badgeGreen,
	icon,
	progress,
	variant,
	onClick,
}: {
	title: string;
	subtitle: string;
	badgeText: string;
	badgeGreen: boolean;
	icon: string;
	progress: number;
	variant?: "challenge";
	onClick: () => void;
}) {
	const isChallenge = variant === "challenge";

	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full text-left rounded-lg p-6 relative overflow-hidden transition-transform active:scale-[0.98] ${
				isChallenge
					? "bg-surface-container border-l-4 border-primary/30"
					: "bg-surface-container-low"
			}`}
		>
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-3">
					{/* Icon */}
					<div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
						<span className="material-symbols-outlined text-xl text-primary">
							{icon}
						</span>
					</div>
					<div>
						<h3 className="font-headline text-xl text-white">{title}</h3>
						<p className="text-on-surface-variant text-sm font-body mt-0.5">
							{subtitle}
						</p>
					</div>
				</div>

				{/* Badge */}
				<span
					className={`font-label text-2xs font-bold px-3 py-1 rounded-full shrink-0 ${
						badgeGreen
							? "bg-secondary-container text-on-secondary-container"
							: "bg-surface-container-highest text-on-surface-variant"
					}`}
				>
					{badgeText}
				</span>
			</div>

			{/* Progress bar */}
			<div className="mt-2">
				<div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
					<div
						className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(63,229,108,0.4)]"
						style={{ width: `${progress}%` }}
					/>
				</div>
				<p className="font-label text-xs text-primary font-bold uppercase tracking-wider mt-2">
					{progress}% Complete
				</p>
			</div>
		</button>
	);
}
