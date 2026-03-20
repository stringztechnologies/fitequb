import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

interface ProfileSummary {
	total_points: number;
	level: { level: number; name: string; min_points: number; perk: string | null };
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
			{/* Hero Section */}
			<div className="relative px-5 pt-6 pb-8 overflow-hidden">
				{/* Gradient glow behind */}
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] bg-brand-green/10 rounded-full blur-[80px]" />

				<div className="relative">
					<p className="text-brand-hint text-sm font-medium tracking-wide uppercase">
						{getGreeting()}
					</p>
					<h1 className="text-[28px] font-bold text-white mt-1 leading-tight">
						{user?.full_name ?? "Athlete"}
					</h1>
				</div>

				{/* Points Card */}
				{profile && (
					<div className="relative mt-5 rounded-2xl bg-gradient-to-br from-brand-card to-brand-card-hover border border-brand-border p-4 shadow-card">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="w-11 h-11 rounded-xl bg-brand-green/15 flex items-center justify-center">
									<span className="text-brand-green text-xl font-bold">{profile.level.level}</span>
								</div>
								<div>
									<p className="text-white font-semibold text-sm">{profile.level.name}</p>
									<p className="text-brand-gold text-xs font-medium">
										{profile.total_points.toLocaleString()} XP
									</p>
								</div>
							</div>
							{profile.level.perk && (
								<span className="px-2.5 py-1 rounded-full bg-brand-gold/15 text-brand-gold text-[10px] font-semibold uppercase tracking-wider">
									{profile.level.level >= 7 ? "Champion" : "Active"}
								</span>
							)}
						</div>

						{/* XP Progress Bar */}
						<div className="mt-3">
							<div className="w-full h-1.5 rounded-full bg-brand-dark/60 overflow-hidden">
								<div
									className="h-full rounded-full bg-gradient-green transition-all duration-500"
									style={{ width: `${progressPct}%` }}
								/>
							</div>
							{profile.next_level && (
								<p className="text-[11px] text-tg-hint mt-1.5">
									{profile.points_to_next.toLocaleString()} XP to{" "}
									<span className="text-brand-green">{profile.next_level.name}</span>
								</p>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Quick Actions */}
			<div className="px-5 mt-2">
				<div className="grid grid-cols-2 gap-3">
					<QuickAction
						icon={
							<svg
								viewBox="0 0 24 24"
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
						}
						label="Equb Rooms"
						sublabel="Join a group"
						color="green"
						onClick={() => navigate("/equbs")}
					/>
					<QuickAction
						icon={
							<svg
								viewBox="0 0 24 24"
								className="w-6 h-6"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
								<path d="M13.73 21a2 2 0 0 1-3.46 0" />
							</svg>
						}
						label="Day Passes"
						sublabel="Visit a gym"
						color="gold"
						onClick={() => navigate("/gyms")}
					/>
				</div>
			</div>

			{/* Feature Cards */}
			<div className="px-5 mt-5 space-y-3">
				<FeatureCard
					title="Equb Rooms"
					subtitle="Stake ETB, complete workouts, split the pot"
					badge="EARN"
					badgeColor="green"
					icon={
						<div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center">
							<svg
								viewBox="0 0 24 24"
								className="w-6 h-6 text-brand-green"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
							</svg>
						</div>
					}
					onClick={() => navigate("/equbs")}
				/>

				<FeatureCard
					title="Step Challenge"
					subtitle="Compete on the Addis Ababa leaderboard"
					badge="COMPETE"
					badgeColor="gold"
					icon={
						<div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center">
							<svg
								viewBox="0 0 24 24"
								className="w-6 h-6 text-brand-gold"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
							>
								<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
							</svg>
						</div>
					}
					onClick={() => navigate("/challenges")}
				/>

				<FeatureCard
					title="Gym Day Passes"
					subtitle="Discounted single-visit passes across Addis"
					badge="SAVE"
					badgeColor="green"
					icon={
						<div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center">
							<svg
								viewBox="0 0 24 24"
								className="w-6 h-6 text-brand-green"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
							>
								<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
								<line x1="3" y1="9" x2="21" y2="9" />
								<line x1="9" y1="21" x2="9" y2="9" />
							</svg>
						</div>
					}
					onClick={() => navigate("/gyms")}
				/>
			</div>

			{/* Tagline */}
			<p className="text-center text-tg-hint text-xs mt-6 tracking-wider uppercase font-medium">
				Stake. Sweat. Split the pot.
			</p>
		</div>
	);
}

function getGreeting(): string {
	const h = new Date().getHours();
	if (h < 12) return "Good morning";
	if (h < 17) return "Good afternoon";
	return "Good evening";
}

function QuickAction({
	icon,
	label,
	sublabel,
	color,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	sublabel: string;
	color: "green" | "gold";
	onClick: () => void;
}) {
	const accent = color === "green" ? "text-brand-green" : "text-brand-gold";
	const bg = color === "green" ? "bg-brand-green/10" : "bg-brand-gold/10";
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex flex-col items-start gap-2 rounded-2xl bg-brand-card border border-brand-border p-4 active:scale-[0.97] transition-transform"
		>
			<div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${accent}`}>
				{icon}
			</div>
			<div>
				<p className="text-white font-semibold text-sm text-left">{label}</p>
				<p className="text-tg-hint text-[11px] text-left">{sublabel}</p>
			</div>
		</button>
	);
}

function FeatureCard({
	title,
	subtitle,
	badge,
	badgeColor,
	icon,
	onClick,
}: {
	title: string;
	subtitle: string;
	badge: string;
	badgeColor: "green" | "gold";
	icon: React.ReactNode;
	onClick: () => void;
}) {
	const badgeCls =
		badgeColor === "green"
			? "bg-brand-green/15 text-brand-green"
			: "bg-brand-gold/15 text-brand-gold";

	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full flex items-center gap-4 rounded-2xl bg-brand-card border border-brand-border p-4 active:bg-brand-card-hover transition-colors text-left"
		>
			{icon}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<h3 className="text-white font-semibold text-sm">{title}</h3>
					<span
						className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${badgeCls}`}
					>
						{badge}
					</span>
				</div>
				<p className="text-tg-hint text-xs mt-0.5 truncate">{subtitle}</p>
			</div>
			<svg
				viewBox="0 0 24 24"
				className="w-5 h-5 text-tg-hint flex-shrink-0"
				fill="none"
				stroke="currentColor"
				strokeWidth={2}
			>
				<polyline points="9 18 15 12 9 6" />
			</svg>
		</button>
	);
}
