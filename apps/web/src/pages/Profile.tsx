import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

interface ProfileData {
	total_points: number;
	referral_code: string;
	badges: { id: string; name: string; icon: string; earned: boolean }[];
}

interface PointEntry {
	id: string;
	points: number;
	reason: string;
	created_at: string;
}

const BADGE_ICON_MAP: Record<string, string> = {
	"Early Bird": "wb_sunny",
	"100k Steps": "workspace_premium",
	Marathoner: "directions_run",
	"Team Player": "groups",
	"Iron Will": "fitness_center",
	Champion: "military_tech",
};

const DEMO_BADGES = [
	{ id: "1", name: "Early Bird", icon: "wb_sunny", earned: true },
	{ id: "2", name: "100k Steps", icon: "workspace_premium", earned: true },
	{ id: "3", name: "Marathoner", icon: "directions_run", earned: true },
	{ id: "4", name: "Team Player", icon: "groups", earned: true },
	{ id: "5", name: "Iron Will", icon: "fitness_center", earned: false },
	{ id: "6", name: "Champion", icon: "military_tech", earned: false },
];

const DEMO_EARNINGS = [
	{
		id: "1",
		reason: "Oct 15, 2023 - Equb Payout",
		points: 3200,
		created_at: "2023-10-15",
	},
	{
		id: "2",
		reason: "Sep 10, 2023 - Step Challenge",
		points: 850,
		created_at: "2023-09-10",
	},
	{
		id: "3",
		reason: "Aug 28, 2023 - Equb Payout",
		points: 2900,
		created_at: "2023-08-28",
	},
	{
		id: "4",
		reason: "Aug 5, 2023 - Early Goal Bonus",
		points: 500,
		created_at: "2023-08-05",
	},
];

export function Profile() {
	const { user, loading: authLoading } = useAuth();
	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [points, setPoints] = useState<PointEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		Promise.all([
			api<ProfileData>("/api/gamification/profile"),
			api<PointEntry[]>("/api/gamification/points"),
		])
			.then(([p, e]) => {
				if (p.data) setProfile(p.data);
				if (e.data) setPoints(e.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (authLoading || loading) return <Loading />;

	// Use demo data if not authenticated
	const name = user?.full_name ?? "Abebe Kebede";
	const initial = name.charAt(0).toUpperCase();
	const totalEarned = profile?.total_points ?? 15400;
	const totalSteps = 2543000;
	const badges = profile?.badges ?? DEMO_BADGES;
	const earnings = points.length > 0 ? points : DEMO_EARNINGS;

	return (
		<div className="bg-background text-on-surface font-body min-h-screen pb-32 px-4 pt-5 relative">
			{/* Settings button */}
			<button
				type="button"
				className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/20"
				aria-label="Settings"
			>
				<span className="material-symbols-outlined text-on-surface-variant text-xl">
					settings
				</span>
			</button>

			{/* Profile hero */}
			<div className="flex flex-col items-center mb-8 pt-4">
				{/* Avatar with gradient ring */}
				<div className="relative">
					<div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary via-primary-container to-secondary shadow-[0_0_30px_rgba(63,229,108,0.3)]">
						<div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center">
							<span className="font-headline text-5xl font-bold text-on-surface">
								{initial}
							</span>
						</div>
					</div>
					{/* Level badge */}
					<span className="absolute -bottom-1 -right-1 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-label font-bold">
						LVL 12
					</span>
				</div>

				<h1 className="font-headline text-3xl font-extrabold tracking-tight mt-4">
					{name}
				</h1>
				<p className="font-label text-primary font-medium tracking-widest text-xs uppercase mt-1">
					Fitness Champion
				</p>
			</div>

			{/* Stats grid */}
			<div className="grid grid-cols-2 gap-4 mb-8">
				{/* Lifetime Earned */}
				<div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
					<div className="flex items-center gap-2 mb-2">
						<span className="material-symbols-outlined text-primary text-base">
							payments
						</span>
						<span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
							Lifetime Earned
						</span>
					</div>
					<div className="text-primary font-headline text-3xl">
						ETB {totalEarned.toLocaleString()}
					</div>
				</div>

				{/* Lifetime Steps */}
				<div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
					<div className="flex items-center gap-2 mb-2">
						<span className="material-symbols-outlined text-primary text-base">
							footprint
						</span>
						<span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
							Lifetime Steps
						</span>
					</div>
					<div className="text-primary font-headline text-3xl">
						{totalSteps.toLocaleString()}
					</div>
				</div>

				{/* Current Streak */}
				<div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
					<div className="flex items-center gap-2 mb-2">
						<span className="material-symbols-outlined text-primary text-base">
							bolt
						</span>
						<span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
							Current Streak
						</span>
					</div>
					<div className="text-primary font-headline text-3xl">7 days</div>
				</div>

				{/* Badges Earned */}
				<div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
					<div className="flex items-center gap-2 mb-2">
						<span className="material-symbols-outlined text-primary text-base">
							stars
						</span>
						<span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
							Badges Earned
						</span>
					</div>
					<div className="text-primary font-headline text-3xl">
						{badges.filter((b) => b.earned).length}/{badges.length}
					</div>
				</div>
			</div>

			{/* Fitness Achievements */}
			<div className="mb-8">
				<h2 className="font-headline text-xl font-bold tracking-tight mb-4">
					Fitness Achievements
				</h2>
				<div className="grid grid-cols-4 gap-4">
					{badges.map((b) => {
						const iconName =
							BADGE_ICON_MAP[b.name] ?? b.icon;
						return (
							<div key={b.id} className="flex flex-col items-center gap-1.5">
								<div
									className={`w-14 h-14 rounded-full flex items-center justify-center border ${
										b.earned
											? "bg-primary/10 border-primary/30"
											: "bg-surface-container border-outline-variant/20 opacity-40"
									}`}
								>
									<span
										className={`material-symbols-outlined text-2xl ${
											b.earned ? "text-primary" : "text-on-surface-variant"
										}`}
									>
										{b.earned ? iconName : "lock"}
									</span>
								</div>
								<span className="font-label text-[8px] uppercase tracking-tighter text-on-surface-variant text-center leading-tight">
									{b.name}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Earning History */}
			<div className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<h2 className="font-headline text-xl font-bold tracking-tight">
						Earning History
					</h2>
					<button
						type="button"
						className="font-label text-xs text-primary font-medium uppercase tracking-wider"
					>
						View All
					</button>
				</div>
				<div className="flex flex-col gap-3">
					{earnings.map((e) => (
						<div
							key={e.id}
							className="bg-surface-container p-4 rounded-lg flex justify-between items-center"
						>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
									<span className="material-symbols-outlined text-primary text-lg">
										account_balance_wallet
									</span>
								</div>
								<div>
									<p className="text-sm text-on-surface font-medium">
										{e.reason}
									</p>
									<p className="font-label text-[10px] text-on-surface-variant uppercase mt-0.5">
										{new Date(e.created_at).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</p>
								</div>
							</div>
							<span className="font-headline text-primary text-sm font-bold">
								+ETB {e.points.toLocaleString()}
							</span>
						</div>
					))}
				</div>
			</div>

			{/* Sync Fitness Data CTA */}
			<button
				type="button"
				onClick={() => navigate("/sync")}
				className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-5 rounded-full font-headline font-bold text-lg shadow-glow-strong active:scale-[0.98] transition-transform"
			>
				<span className="flex items-center justify-center gap-2">
					<span className="material-symbols-outlined text-xl">sync</span>
					Sync Fitness Data
				</span>
			</button>
			<p className="text-center mt-2 font-label text-[10px] text-on-surface-variant uppercase tracking-wider">
				Last synced: 2 hours ago
			</p>
		</div>
	);
}
