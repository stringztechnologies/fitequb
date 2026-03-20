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
	if (!profile || !user) return <div className="p-4 text-tg-hint">Could not load profile</div>;

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
		<div className="p-4 pb-20">
			{/* Header */}
			<div className="text-center mb-6">
				<div className="text-4xl mb-2">
					{profile.level.level >= 7 ? "🏆" : profile.level.level >= 4 ? "⭐" : "💪"}
				</div>
				<h1 className="text-xl font-bold text-tg-text">{user.full_name}</h1>
				<p className="text-sm text-tg-hint">@{user.username ?? "anonymous"}</p>
			</div>

			{/* Level + Points Card */}
			<div className="rounded-xl bg-tg-secondary-bg p-4 mb-4">
				<div className="flex justify-between items-center mb-2">
					<span className="text-sm font-medium text-tg-text">
						Lv.{profile.level.level} {profile.level.name}
					</span>
					<span className="text-sm font-bold text-tg-button">
						{profile.total_points.toLocaleString()} pts
					</span>
				</div>

				{/* Progress bar */}
				<div className="w-full bg-tg-bg rounded-full h-2 mb-1">
					<div
						className="bg-tg-button rounded-full h-2 transition-all"
						style={{ width: `${progressPct}%` }}
					/>
				</div>

				{profile.next_level ? (
					<p className="text-xs text-tg-hint">
						{profile.points_to_next.toLocaleString()} pts to Level {profile.next_level.level}{" "}
						{profile.next_level.name}
					</p>
				) : (
					<p className="text-xs text-tg-hint">Max level reached!</p>
				)}

				{profile.level.perk && (
					<div className="mt-2 px-2 py-1 bg-tg-button/10 rounded text-xs text-tg-button">
						Perk: {profile.level.perk}
					</div>
				)}
			</div>

			{/* Badges — Earned */}
			<div className="mb-4">
				<h2 className="font-semibold text-tg-text mb-2">
					Badges ({earnedBadges.length}/{profile.badges.length})
				</h2>
				{earnedBadges.length > 0 ? (
					<div className="grid grid-cols-4 gap-2">
						{earnedBadges.map((b) => (
							<div key={b.id} className="text-center">
								<div className="text-2xl">{b.icon}</div>
								<p className="text-[10px] text-tg-text leading-tight mt-1">{b.name}</p>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-tg-hint">No badges earned yet. Keep working out!</p>
				)}
			</div>

			{/* Badges — Locked */}
			{unearnedBadges.length > 0 && (
				<div className="mb-4">
					<h3 className="text-sm font-medium text-tg-hint mb-2">Locked</h3>
					<div className="grid grid-cols-4 gap-2">
						{unearnedBadges.map((b) => (
							<div key={b.id} className="text-center opacity-30">
								<div className="text-2xl">{b.icon}</div>
								<p className="text-[10px] text-tg-hint leading-tight mt-1">{b.name}</p>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Referral */}
			<div className="rounded-xl bg-tg-secondary-bg p-4 mb-4">
				<h2 className="font-semibold text-tg-text mb-2">Refer a Friend</h2>
				<p className="text-xs text-tg-hint mb-2">
					Share your code and earn 100 points when they join!
				</p>
				<div className="flex gap-2 mb-3">
					<code className="flex-1 px-3 py-2 bg-tg-bg rounded text-sm text-tg-text font-mono">
						{profile.referral_code}
					</code>
					<button
						type="button"
						onClick={copyReferralCode}
						className="px-3 py-2 bg-tg-button text-tg-button-text rounded text-sm"
					>
						{copied ? "Copied!" : "Copy"}
					</button>
				</div>

				<p className="text-xs text-tg-hint mb-1">Have a referral code?</p>
				<div className="flex gap-2">
					<input
						type="text"
						value={referralInput}
						onChange={(e) => setReferralInput(e.target.value)}
						placeholder="Enter code"
						className="flex-1 px-3 py-2 bg-tg-bg rounded text-sm text-tg-text"
					/>
					<button
						type="button"
						onClick={handleReferral}
						className="px-3 py-2 bg-tg-button text-tg-button-text rounded text-sm"
					>
						Apply
					</button>
				</div>
				{referralMsg && <p className="text-xs text-tg-hint mt-1">{referralMsg}</p>}
			</div>

			{/* Recent Points */}
			<div>
				<h2 className="font-semibold text-tg-text mb-2">Recent Points</h2>
				{points.length > 0 ? (
					<div className="space-y-2">
						{points.slice(0, 10).map((p) => (
							<div
								key={p.id}
								className="flex justify-between items-center px-3 py-2 bg-tg-secondary-bg rounded"
							>
								<div>
									<p className="text-sm text-tg-text">{p.reason}</p>
									<p className="text-xs text-tg-hint">
										{new Date(p.created_at).toLocaleDateString()}
									</p>
								</div>
								<span className="text-sm font-bold text-green-500">+{p.points}</span>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-tg-hint">No points earned yet.</p>
				)}
			</div>
		</div>
	);
}
