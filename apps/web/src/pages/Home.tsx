import { useEffect, useState } from "react";
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
		<div className="p-4 pb-20">
			<h1 className="text-2xl font-bold text-tg-text mb-1">FitEqub</h1>
			{user && <p className="text-sm text-tg-hint mb-4">Welcome, {user.full_name}</p>}

			{/* Points & Level Card */}
			{profile && (
				<div className="rounded-xl bg-tg-secondary-bg p-4 mb-4">
					<div className="flex justify-between items-center mb-2">
						<div className="flex items-center gap-2">
							<span className="text-lg">
								{profile.level.level >= 7 ? "🏆" : profile.level.level >= 4 ? "⭐" : "💪"}
							</span>
							<span className="text-sm font-medium text-tg-text">
								Lv.{profile.level.level} {profile.level.name}
							</span>
						</div>
						<span className="text-sm font-bold text-tg-button">
							{profile.total_points.toLocaleString()} pts
						</span>
					</div>
					<div className="w-full bg-tg-bg rounded-full h-1.5">
						<div
							className="bg-tg-button rounded-full h-1.5 transition-all"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
					{profile.next_level && (
						<p className="text-[11px] text-tg-hint mt-1">
							{profile.points_to_next.toLocaleString()} pts to Lv.{profile.next_level.level}
						</p>
					)}
				</div>
			)}

			<p className="text-tg-hint text-sm mb-6">Stake. Sweat. Split the pot.</p>

			<div className="space-y-3">
				<SectionCard
					title="Equb Rooms"
					description="Join a fitness accountability group"
					href="/equbs"
				/>
				<SectionCard
					title="Gym Day Passes"
					description="Discounted single-visit passes"
					href="/gyms"
				/>
				<SectionCard
					title="Step Challenge"
					description="Compete on the city leaderboard"
					href="/challenges"
				/>
			</div>
		</div>
	);
}

function SectionCard({
	title,
	description,
	href,
}: {
	title: string;
	description: string;
	href: string;
}) {
	return (
		<a
			href={href}
			className="block rounded-xl bg-tg-secondary-bg p-4 active:opacity-70 transition-opacity"
		>
			<h2 className="font-semibold text-tg-text">{title}</h2>
			<p className="text-sm text-tg-hint mt-1">{description}</p>
		</a>
	);
}
