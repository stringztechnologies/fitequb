import { useEffect, useState } from "react";
import { Loading } from "../components/Loading.js";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

interface ProfileData {
	total_points: number;
	level: {
		level: number;
		name: string;
		min_points: number;
		perk: string | null;
	};
	next_level: { level: number; name: string; min_points: number } | null;
	points_to_next: number;
	referral_code: string;
	badges: {
		id: string;
		name: string;
		description: string;
		icon: string;
		category: string;
		bonus_points: number;
		earned: boolean;
	}[];
}

interface PointEntry {
	id: string;
	points: number;
	reason: string;
	source_type: string;
	created_at: string;
}

export function Profile() {
	const { user, loading: authLoading } = useAuth();
	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [points, setPoints] = useState<PointEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [referralInput, setReferralInput] = useState("");
	const [referralMsg, setReferralMsg] = useState("");
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		Promise.all([
			api<ProfileData>("/api/gamification/profile"),
			api<PointEntry[]>("/api/gamification/points"),
		])
			.then(([profileRes, pointsRes]) => {
				if (profileRes.data) setProfile(profileRes.data);
				if (pointsRes.data) setPoints(pointsRes.data);
			})
			.finally(() => setLoading(false));
	}, []);

	if (authLoading || loading) return <Loading />;
	if (!profile || !user) return <div className="p-5 text-tg-hint">Could not load profile</div>;

	const progressPct = profile.next_level
		? Math.min(
				100,
				((profile.total_points - profile.level.min_points) /
					(profile.next_level.min_points - profile.level.min_points)) *
					100,
			)
		: 100;

	const earnedBadges = profile.badges.filter((b) => b.earned);
	const unearnedBadges = profile.badges.filter((b) => !b.earned);

	async function handleReferral() {
		if (!referralInput.trim()) return;
		const res = await api<{ success: boolean }>("/api/gamification/referral", {
			method: "POST",
			body: JSON.stringify({ code: referralInput.trim() }),
		});
		setReferralMsg(res.error ?? "Referral applied!");
		setReferralInput("");
	}

	function copyReferralCode() {
		navigator.clipboard.writeText(profile?.referral_code ?? "");
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<div className="px-5 pt-6 pb-24">
			{/* Avatar + Name */}
			<div className="text-center mb-6">
				<div className="w-20 h-20 mx-auto rounded-full bg-gradient-green flex items-center justify-center mb-3 shadow-glow">
					<span className="text-3xl font-bold text-black">
						{user.full_name.charAt(0).toUpperCase()}
					</span>
				</div>
				<h1 className="text-xl font-bold text-white">{user.full_name}</h1>
				<p className="text-sm text-tg-hint">@{user.username ?? "anonymous"}</p>
			</div>

			{/* Level Card */}
			<div className="rounded-2xl bg-brand-card border border-brand-border p-4 mb-4">
				<div className="flex justify-between items-center mb-3">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 rounded-xl bg-brand-green/15 flex items-center justify-center">
							<span className="text-brand-green text-lg font-bold">{profile.level.level}</span>
						</div>
						<div>
							<p className="text-white font-semibold text-sm">{profile.level.name}</p>
							{profile.level.perk && (
								<p className="text-brand-gold text-[10px] font-medium mt-0.5">
									{profile.level.perk}
								</p>
							)}
						</div>
					</div>
					<div className="text-right">
						<p className="text-brand-gold font-bold text-lg">
							{profile.total_points.toLocaleString()}
						</p>
						<p className="text-[10px] text-tg-hint">XP</p>
					</div>
				</div>

				<div className="w-full h-2 rounded-full bg-brand-dark overflow-hidden">
					<div
						className="h-full rounded-full bg-gradient-green transition-all duration-500"
						style={{ width: `${progressPct}%` }}
					/>
				</div>
				{profile.next_level ? (
					<p className="text-[11px] text-tg-hint mt-1.5">
						{profile.points_to_next.toLocaleString()} XP to{" "}
						<span className="text-brand-green">{profile.next_level.name}</span>
					</p>
				) : (
					<p className="text-[11px] text-brand-gold mt-1.5 font-medium">Max level reached!</p>
				)}
			</div>

			{/* Badges — Earned */}
			<div className="mb-4">
				<h2 className="text-sm font-semibold text-white mb-3">
					Badges ({earnedBadges.length}/{profile.badges.length})
				</h2>
				{earnedBadges.length > 0 ? (
					<div className="grid grid-cols-4 gap-3">
						{earnedBadges.map((b) => (
							<div key={b.id} className="text-center">
								<div className="w-12 h-12 mx-auto rounded-xl bg-brand-green/10 flex items-center justify-center text-2xl shadow-glow">
									{b.icon}
								</div>
								<p className="text-[10px] text-white leading-tight mt-1.5 font-medium">{b.name}</p>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-tg-hint bg-brand-card rounded-xl p-4 text-center border border-brand-border">
						No badges earned yet. Keep working out!
					</p>
				)}
			</div>

			{/* Badges — Locked */}
			{unearnedBadges.length > 0 && (
				<div className="mb-5">
					<h3 className="text-xs font-medium text-tg-hint mb-2 uppercase tracking-wider">Locked</h3>
					<div className="grid grid-cols-4 gap-3">
						{unearnedBadges.map((b) => (
							<div key={b.id} className="text-center opacity-25">
								<div className="w-12 h-12 mx-auto rounded-xl bg-brand-card flex items-center justify-center text-2xl border border-brand-border">
									{b.icon}
								</div>
								<p className="text-[10px] text-tg-hint leading-tight mt-1.5">{b.name}</p>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Referral */}
			<div className="rounded-2xl bg-brand-card border border-brand-border p-4 mb-5">
				<h2 className="text-sm font-semibold text-white mb-1">Refer a Friend</h2>
				<p className="text-xs text-tg-hint mb-3">
					Share your code and earn <span className="text-brand-gold font-semibold">100 XP</span>{" "}
					when they join!
				</p>
				<div className="flex gap-2 mb-3">
					<code className="flex-1 px-3 py-2.5 bg-brand-dark rounded-xl text-sm text-brand-green font-mono border border-brand-border">
						{profile.referral_code}
					</code>
					<button
						type="button"
						onClick={copyReferralCode}
						className="px-4 py-2.5 bg-gradient-green text-black rounded-xl text-xs font-bold active:scale-95 transition-transform"
					>
						{copied ? "Copied!" : "Copy"}
					</button>
				</div>

				<p className="text-xs text-tg-hint mb-2">Have a referral code?</p>
				<div className="flex gap-2">
					<input
						type="text"
						value={referralInput}
						onChange={(e) => setReferralInput(e.target.value)}
						placeholder="Enter code"
						className="flex-1 px-3 py-2.5 bg-brand-dark border border-brand-border text-white rounded-xl text-sm outline-none focus:border-brand-green transition-colors placeholder:text-tg-hint/50"
					/>
					<button
						type="button"
						onClick={handleReferral}
						className="px-4 py-2.5 bg-brand-card border border-brand-border text-white rounded-xl text-xs font-semibold active:bg-brand-card-hover transition-colors"
					>
						Apply
					</button>
				</div>
				{referralMsg && <p className="text-xs text-brand-green mt-2">{referralMsg}</p>}
			</div>

			{/* Recent Points */}
			<div>
				<h2 className="text-sm font-semibold text-white mb-3">Recent Activity</h2>
				{points.length > 0 ? (
					<div className="space-y-2">
						{points.slice(0, 10).map((p) => (
							<div
								key={p.id}
								className="flex justify-between items-center px-4 py-3 bg-brand-card border border-brand-border rounded-xl"
							>
								<div>
									<p className="text-sm text-white">{p.reason}</p>
									<p className="text-[10px] text-tg-hint mt-0.5">
										{new Date(p.created_at).toLocaleDateString()}
									</p>
								</div>
								<span className="text-sm font-bold text-brand-green">+{p.points}</span>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-tg-hint bg-brand-card rounded-xl p-4 text-center border border-brand-border">
						No points earned yet.
					</p>
				)}
			</div>
		</div>
	);
}
