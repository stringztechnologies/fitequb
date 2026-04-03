import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.js";
import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

interface ProfileData {
	total_points: number;
	referral_code: string | null;
	badges: { id: string; name: string; icon: string; earned: boolean }[];
	total_steps?: number;
	current_streak?: number;
	referral_invited?: number;
	referral_joined?: number;
	referral_earned?: number;
}

interface PointEntry {
	id: string;
	points: number;
	reason: string;
	created_at: string;
}

export function Profile() {
	const { user, loading: authLoading, isGuest, authMethod, signOut } = useAuth();
	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [points, setPoints] = useState<PointEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		if (isGuest) {
			setLoading(false);
			return;
		}
		Promise.all([
			api<ProfileData>("/api/gamification/profile"),
			api<PointEntry[]>("/api/gamification/points"),
		])
			.then(([p, e]) => {
				if (p.data) setProfile(p.data);
				if (e.data) setPoints(e.data);
			})
			.finally(() => setLoading(false));
	}, [isGuest]);

	if (authLoading || loading) return <Loading />;

	if (isGuest) {
		return (
			<div className="bg-background min-h-screen flex flex-col items-center justify-center px-6 gap-6">
				<div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
					<span className="material-symbols-outlined text-primary text-5xl">person</span>
				</div>
				<div className="text-center">
					<h1 className="font-headline text-2xl font-bold text-on-surface mb-2">Your Profile</h1>
					<p className="text-on-surface-variant text-sm leading-relaxed max-w-xs">
						Sign in to track your workouts, earn badges, and compete on the leaderboard.
					</p>
				</div>
				<button
					type="button"
					onClick={() => navigate("/signin")}
					className="w-full max-w-xs py-4 rounded-2xl bg-primary text-on-primary font-headline font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
				>
					<span className="material-symbols-outlined text-xl">login</span>
					Sign In
				</button>
				<a
					href="https://t.me/fitequb_bot"
					target="_blank"
					rel="noopener noreferrer"
					className="w-full max-w-xs py-3 rounded-2xl bg-[#0088cc]/10 text-[#0088cc] font-headline font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
				>
					<svg viewBox="0 0 24 24" className="w-4 h-4" fill="#0088cc">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
					</svg>
					Or open in Telegram
				</a>
			</div>
		);
	}

	if (!user) {
		const tgCheck = window.Telegram?.WebApp?.initDataUnsafe?.user;
		if (!tgCheck && !profile) {
			return (
				<div className="bg-background min-h-screen flex items-center justify-center px-4">
					<EmptyState
						icon="person"
						title="Sign in to see your profile"
						subtitle="Open FitEqub in Telegram to get started"
					/>
				</div>
			);
		}
	}

	const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user as
		| { first_name?: string; last_name?: string }
		| undefined;
	const name =
		user?.full_name ??
		(tgUser?.first_name
			? `${tgUser.first_name}${tgUser.last_name ? ` ${tgUser.last_name}` : ""}`
			: "User");
	const initial = name.charAt(0).toUpperCase();
	const totalEarned = profile?.total_points ?? 0;
	const totalSteps = profile?.total_steps ?? 0;
	const currentStreak = profile?.current_streak ?? 0;
	const badges = profile?.badges ?? [];
	const earnedBadgeCount = badges.filter((b) => b.earned).length;

	return (
		<div className="bg-background text-on-surface font-body min-h-screen pb-32 px-4 pt-5 relative">
			{/* Settings button */}
			<button
				type="button"
				onClick={() => navigate("/notifications")}
				className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/20 active:scale-95 transition-transform"
				aria-label="Notifications"
			>
				<span className="material-symbols-outlined text-on-surface-variant text-xl">
					notifications
				</span>
			</button>

			{/* Profile hero */}
			<div className="flex flex-col items-center mb-8 pt-4">
				<div className="relative">
					<div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary via-primary-container to-secondary shadow-[0_0_30px_rgba(63,229,108,0.3)]">
						<div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center">
							<span className="font-headline text-5xl font-bold text-on-surface">{initial}</span>
						</div>
					</div>
				</div>

				<h1 className="font-headline text-3xl font-extrabold tracking-tight mt-4">{name}</h1>
				<p className="font-label text-primary font-medium tracking-widest text-xs uppercase mt-1">
					FitEqub Member
				</p>
			</div>

			{/* Stats grid */}
			<div className="grid grid-cols-2 gap-4 mb-8">
				<div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
					<div className="flex items-center gap-2 mb-2">
						<span className="material-symbols-outlined text-primary text-base">payments</span>
						<span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
							Lifetime Earned
						</span>
					</div>
					<div className="text-primary font-headline text-3xl">
						ETB {totalEarned.toLocaleString()}
					</div>
				</div>

				<div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
					<div className="flex items-center gap-2 mb-2">
						<span className="material-symbols-outlined text-primary text-base">footprint</span>
						<span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
							Lifetime Steps
						</span>
					</div>
					<div className="text-primary font-headline text-3xl">{totalSteps.toLocaleString()}</div>
				</div>

				<div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
					<div className="flex items-center gap-2 mb-2">
						<span className="material-symbols-outlined text-primary text-base">bolt</span>
						<span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
							Current Streak
						</span>
					</div>
					<div className="text-primary font-headline text-3xl">
						{currentStreak} {currentStreak === 1 ? "day" : "days"}
					</div>
				</div>

				<div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
					<div className="flex items-center gap-2 mb-2">
						<span className="material-symbols-outlined text-primary text-base">stars</span>
						<span className="font-label text-[10px] text-on-surface-variant tracking-[0.2em] uppercase">
							Badges Earned
						</span>
					</div>
					<div className="text-primary font-headline text-3xl">
						{badges.length > 0 ? `${earnedBadgeCount}/${badges.length}` : "0"}
					</div>
				</div>
			</div>

			{/* Fitness Achievements */}
			<div className="mb-8">
				<h2 className="font-headline text-xl font-bold tracking-tight mb-4">
					Fitness Achievements
				</h2>
				{badges.length > 0 ? (
					<div className="grid grid-cols-4 gap-4">
						{badges.map((b) => (
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
										{b.earned ? b.icon : "lock"}
									</span>
								</div>
								<span className="font-label text-[8px] uppercase tracking-tighter text-on-surface-variant text-center leading-tight">
									{b.name}
								</span>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-on-surface-variant text-center py-6">No badges yet</p>
				)}
			</div>

			{/* Earning History */}
			<div className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<h2 className="font-headline text-xl font-bold tracking-tight">Earning History</h2>
					{points.length > 4 && (
						<button
							type="button"
							className="font-label text-xs text-primary font-medium uppercase tracking-wider"
						>
							View All
						</button>
					)}
				</div>
				{points.length > 0 ? (
					<div className="flex flex-col gap-3">
						{points.map((e) => (
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
										<p className="text-sm text-on-surface font-medium">{e.reason}</p>
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
				) : (
					<p className="text-sm text-on-surface-variant text-center py-6">No earnings yet</p>
				)}
			</div>

			{/* Referral Section */}
			<div className="mb-8">
				<h2 className="font-headline text-xl font-bold tracking-tight mb-4">Invite Friends</h2>
				<div className="bg-surface-container-low rounded-lg p-5 border border-primary/10">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
							<span className="material-symbols-outlined text-primary text-2xl">group_add</span>
						</div>
						<div>
							<p className="font-headline text-sm font-bold text-on-surface">
								Earn 100 ETB per referral
							</p>
							<p className="text-on-surface-variant text-xs mt-0.5">
								When your friend completes their first Equb
							</p>
						</div>
					</div>

					{/* Referral Code */}
					<div className="bg-background/50 rounded-lg p-4 flex items-center justify-between mb-3">
						<div>
							<p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">
								Your Referral Code
							</p>
							<p className="font-headline text-lg font-bold text-primary mt-0.5">
								{profile?.referral_code ?? "Sign in to get your code"}
							</p>
						</div>
						{profile?.referral_code && (
							<button
								type="button"
								onClick={() => {
									navigator.clipboard?.writeText(profile.referral_code as string).catch(() => {});
								}}
								className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center active:scale-90 transition-transform"
							>
								<span className="material-symbols-outlined text-primary text-lg">content_copy</span>
							</button>
						)}
					</div>

					{/* Referral Stats */}
					<div className="grid grid-cols-3 gap-3">
						<div className="text-center">
							<p className="font-headline text-xl font-bold text-on-surface">
								{profile?.referral_invited ?? 0}
							</p>
							<p className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest">
								Invited
							</p>
						</div>
						<div className="text-center">
							<p className="font-headline text-xl font-bold text-primary">
								{profile?.referral_joined ?? 0}
							</p>
							<p className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest">
								Joined
							</p>
						</div>
						<div className="text-center">
							<p className="font-headline text-xl font-bold text-secondary-container">
								{profile?.referral_earned ?? 0}
							</p>
							<p className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest">
								ETB Earned
							</p>
						</div>
					</div>

					{/* Share Button */}
					{profile?.referral_code && (
						<button
							type="button"
							onClick={() => {
								const code = profile.referral_code as string;
								const text = `Join FitEqub! Stake money on your fitness goals and win real ETB. Use my referral code: ${code}\nhttps://t.me/fitequb_bot?start=REF-${code}`;
								if (navigator.share) {
									navigator.share({ title: "Join FitEqub!", text }).catch(() => {});
								} else {
									window.open(
										`https://t.me/share/url?url=${encodeURIComponent(`https://t.me/fitequb_bot?start=REF-${code}`)}&text=${encodeURIComponent(text)}`,
										"_blank",
									);
								}
							}}
							className="mt-4 w-full py-3 rounded-full border-2 border-primary text-primary font-headline font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
						>
							<span className="material-symbols-outlined text-lg">share</span>
							Share Invite Link
						</button>
					)}
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

			{/* Sign Out (web users only) */}
			{authMethod === "supabase" && (
				<button
					type="button"
					onClick={async () => {
						await signOut();
						navigate("/");
					}}
					className="w-full mt-4 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant font-body text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
				>
					<span className="material-symbols-outlined text-lg">logout</span>
					Sign Out
				</button>
			)}
		</div>
	);
}
