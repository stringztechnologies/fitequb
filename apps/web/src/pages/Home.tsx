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

	const circ = 2 * Math.PI * 72;

	return (
		<div className="pb-24">
			<div className="px-4 pt-5 pb-1">
				<h1 className="text-[22px] font-bold text-white leading-tight">FitEqub</h1>
				<p className="text-[13px] text-[#8E8E93] mt-1">
					{user ? `Welcome, ${user.full_name}` : "Stake. Sweat. Split the pot."}
				</p>
			</div>

			<div className="flex flex-col items-center pt-6 pb-4">
				<p className="text-[11px] text-[#8E8E93] uppercase tracking-[0.15em] mb-4 font-medium">
					Your Progress
				</p>

				<div className="relative w-[176px] h-[176px]">
					<svg
						viewBox="0 0 180 180"
						className="w-full h-full"
						style={{ transform: "rotate(-90deg)" }}
					>
						<circle cx="90" cy="90" r="72" fill="none" stroke="#1c1c1e" strokeWidth="12" />
						<circle
							cx="90"
							cy="90"
							r="72"
							fill="none"
							stroke="#00C853"
							strokeWidth="12"
							strokeLinecap="round"
							strokeDasharray={`${(progressPct / 100) * circ} ${circ}`}
							style={{ filter: "drop-shadow(0 0 8px rgba(0,200,83,0.5))" }}
						/>
					</svg>
					<div className="absolute inset-0 flex flex-col items-center justify-center">
						<span className="text-[28px] font-bold text-[#FFD700] leading-none">
							{(profile?.total_points ?? 0).toLocaleString()}
						</span>
						<span className="text-[10px] text-[#8E8E93] mt-1 uppercase tracking-wider">ETB</span>
						<span className="text-[9px] text-[#8E8E93] mt-0.5">Potential Payout</span>
					</div>
				</div>
			</div>

			<div className="px-4 space-y-3">
				<FeatureCard
					title="Equb Rooms"
					subtitle="Join a fitness accountability group"
					badgeText="Ends in 2 days"
					green={false}
					onClick={() => navigate("/equbs")}
				/>
				<FeatureCard
					title="Gym Day Passes"
					subtitle="Discounted single-visit passes"
					badgeText="Discount Active"
					green
					onClick={() => navigate("/gyms")}
				/>
				<FeatureCard
					title="Step Challenge"
					subtitle="Compete on the city leaderboard"
					badgeText={`${(profile?.total_points ?? 0).toLocaleString()} Steps`}
					green={false}
					onClick={() => navigate("/challenges")}
				/>
			</div>
		</div>
	);
}

function FeatureCard({
	title,
	subtitle,
	badgeText,
	green,
	onClick,
}: {
	title: string;
	subtitle: string;
	badgeText: string;
	green: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full flex items-center justify-between rounded-[16px] bg-[#1c1c1e] p-4 active:bg-[#2c2c2e] transition-colors text-left"
		>
			<div className="flex-1 min-w-0 mr-3">
				<h3 className="text-[15px] font-semibold text-white">{title}</h3>
				<p className="text-[12px] text-[#8E8E93] mt-0.5">{subtitle}</p>
			</div>
			<span
				className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
					green ? "bg-[rgba(0,200,83,0.15)] text-[#00C853]" : "bg-[#2c2c2e] text-[#8E8E93]"
				}`}
			>
				{badgeText}
			</span>
		</button>
	);
}
