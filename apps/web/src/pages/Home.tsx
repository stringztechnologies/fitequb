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
		: 100;

	return (
		<div className="pb-24">
			{/* Header */}
			<div className="px-5 pt-5 pb-2">
				<h1 className="text-2xl font-bold text-white">FitEqub</h1>
				<p className="text-xs text-tg-hint mt-0.5">
					{user ? `Welcome, ${user.full_name}` : "Stake. Sweat. Split the pot."}
				</p>
			</div>

			{/* Progress Ring Section */}
			<div className="flex flex-col items-center py-6">
				<p className="text-xs text-tg-hint uppercase tracking-widest mb-3">Your Progress</p>

				{/* SVG Progress Ring */}
				<div className="relative w-44 h-44">
					<svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
						{/* Background track */}
						<circle cx="90" cy="90" r="78" fill="none" stroke="#1A1D24" strokeWidth="10" />
						{/* Progress arc */}
						<circle
							cx="90"
							cy="90"
							r="78"
							fill="none"
							stroke="url(#greenGrad)"
							strokeWidth="10"
							strokeLinecap="round"
							strokeDasharray={`${(progressPct / 100) * 490} 490`}
							className="transition-all duration-1000"
						/>
						{/* Glow effect */}
						<circle
							cx="90"
							cy="90"
							r="78"
							fill="none"
							stroke="url(#greenGrad)"
							strokeWidth="10"
							strokeLinecap="round"
							strokeDasharray={`${(progressPct / 100) * 490} 490`}
							filter="url(#glow)"
							opacity="0.4"
						/>
						<defs>
							<linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" stopColor="#00C853" />
								<stop offset="100%" stopColor="#00E676" />
							</linearGradient>
							<filter id="glow">
								<feGaussianBlur stdDeviation="4" result="blur" />
								<feMerge>
									<feMergeNode in="blur" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>
					</svg>

					{/* Center text */}
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<span className="text-3xl font-bold text-brand-gold">
							{profile?.total_points.toLocaleString() ?? "0"}
						</span>
						<span className="text-[10px] text-tg-hint uppercase tracking-wider mt-0.5">
							{profile?.next_level ? "XP" : "Potential Payout"}
						</span>
					</div>
				</div>
			</div>

			{/* Feature Cards */}
			<div className="px-4 space-y-3">
				<FeatureCard
					title="Equb Rooms"
					subtitle="Join a fitness accountability group"
					badge={profile ? `Lv.${profile.level.level}` : undefined}
					badgeColor="gold"
					onClick={() => navigate("/equbs")}
				/>
				<FeatureCard
					title="Gym Day Passes"
					subtitle="Discounted single-visit passes"
					badge="Discount Active"
					badgeColor="green"
					onClick={() => navigate("/gyms")}
				/>
				<FeatureCard
					title="Step Challenge"
					subtitle="Compete on the city leaderboard"
					badge={`${(profile?.total_points ?? 0).toLocaleString()} Steps`}
					badgeColor="hint"
					onClick={() => navigate("/challenges")}
				/>
			</div>
		</div>
	);
}

function FeatureCard({
	title,
	subtitle,
	badge,
	badgeColor,
	onClick,
}: {
	title: string;
	subtitle: string;
	badge?: string;
	badgeColor: "green" | "gold" | "hint";
	onClick: () => void;
}) {
	const badgeCls =
		badgeColor === "green"
			? "bg-brand-green/15 text-brand-green"
			: badgeColor === "gold"
				? "bg-brand-gold/15 text-brand-gold"
				: "bg-brand-border text-tg-hint";

	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full flex items-center justify-between rounded-2xl bg-brand-card border border-brand-border p-4 active:bg-brand-card-hover transition-colors text-left"
		>
			<div className="flex-1 min-w-0">
				<h3 className="text-white font-semibold text-[15px]">{title}</h3>
				<p className="text-tg-hint text-xs mt-0.5">{subtitle}</p>
			</div>
			{badge && (
				<span
					className={`ml-3 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${badgeCls}`}
				>
					{badge}
				</span>
			)}
		</button>
	);
}
