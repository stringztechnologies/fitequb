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
	if (!profile || !user) return <div className="p-5 text-[#8E8E93]">Could not load profile</div>;

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
			{/* Avatar with gold ring */}
			<div className="flex flex-col items-center mb-6">
				<div className="w-24 h-24 rounded-full border-[3px] border-[#FFD700] bg-[#1c1c1e] flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
					<span className="text-4xl font-bold text-white">
						{user.full_name.charAt(0).toUpperCase()}
					</span>
				</div>
				<h1 className="text-xl font-bold text-white">{user.full_name}</h1>
				<p className="text-sm text-[#8E8E93]">@{user.username ?? "anonymous"}</p>
			</div>

			{/* Stat Cards — green border for earned, cyan for steps */}
			<div className="grid grid-cols-2 gap-3 mb-5">
				<div className="rounded-[12px] border-2 border-[#00C853] p-3">
					<div className="flex items-center justify-between mb-1">
						<p className="text-[12px] text-[#00C853]">Total Earned</p>
						<svg
							viewBox="0 0 24 24"
							className="w-4 h-4 text-[#FFD700]"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="16" />
							<path d="M9 12h6" />
						</svg>
					</div>
					<p className="text-[#00C853] font-bold text-[22px]">
						ETB {profile.total_points.toLocaleString()}
					</p>
				</div>
				<div className="rounded-[12px] border-2 border-[#00BCD4] p-3">
					<div className="flex items-center justify-between mb-1">
						<p className="text-[12px] text-[#00BCD4]">Total Steps</p>
						<svg
							viewBox="0 0 24 24"
							className="w-4 h-4 text-[#00BCD4]"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
						>
							<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
						</svg>
					</div>
					<p className="text-[#00BCD4] font-bold text-[22px]">
						{profile.total_points.toLocaleString()}
					</p>
				</div>
			</div>

			{/* Badge Grid */}
			<div className="mb-5">
				<h2 className="text-sm font-semibold text-white mb-3">Fitness Achievements</h2>
				{earnedBadges.length > 0 ? (
					<div className="grid grid-cols-4 gap-3">
						{earnedBadges.map((b) => (
							<div key={b.id} className="flex flex-col items-center">
								<div className="w-14 h-14 rounded-full bg-[rgba(0,200,83,0.1)] border border-[rgba(0,200,83,0.3)]/30 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(0,200,83,0.2)]">
									{b.icon}
								</div>
								<p className="text-[10px] text-white leading-tight mt-1.5 font-medium text-center">
									{b.name}
								</p>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-[#8E8E93] bg-[#1c1c1e] rounded-xl p-4 text-center border border-[#2c2c2e]">
						No badges yet. Keep working out!
					</p>
				)}
				{unearnedBadges.length > 0 && (
					<div className="grid grid-cols-4 gap-3 mt-3">
						{unearnedBadges.map((b) => (
							<div key={b.id} className="flex flex-col items-center opacity-25">
								<div className="w-14 h-14 rounded-full bg-[#1c1c1e] border border-[#2c2c2e] flex items-center justify-center text-2xl">
									{b.icon}
								</div>
								<p className="text-[10px] text-[#8E8E93] leading-tight mt-1.5 text-center">
									{b.name}
								</p>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Earning History */}
			<div className="mb-5">
				<h2 className="text-sm font-semibold text-white mb-3">Earning History</h2>
				{points.length > 0 ? (
					<div className="space-y-1">
						{points.slice(0, 8).map((p) => (
							<div
								key={p.id}
								className="flex items-center justify-between py-2.5 border-b border-[#2c2c2e]/50 last:border-0"
							>
								<p className="text-sm text-[#8E8E93]">{p.reason}</p>
								<span className="text-sm font-bold text-[#00C853] ml-3 shrink-0">
									ETB {p.points}
								</span>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-[#8E8E93] text-center">No earnings yet.</p>
				)}
			</div>

			{/* Referral */}
			<div className="rounded-[16px] bg-[#1c1c1e] border border-[#2c2c2e] p-4 mb-5">
				<h2 className="text-sm font-semibold text-white mb-1">Refer a Friend</h2>
				<p className="text-xs text-[#8E8E93] mb-3">
					Earn <span className="text-[#FFD700] font-semibold">100 XP</span> per referral
				</p>
				<div className="flex gap-2 mb-3">
					<code className="flex-1 px-3 py-2.5 bg-[#0a0a0a] rounded-xl text-sm text-[#00C853] font-mono border border-[#2c2c2e]">
						{profile.referral_code}
					</code>
					<button
						type="button"
						onClick={copyReferralCode}
						className="px-4 py-2.5 bg-[#00C853] text-black rounded-xl text-xs font-bold active:scale-95 transition-transform"
					>
						{copied ? "Copied!" : "Copy"}
					</button>
				</div>
				<div className="flex gap-2">
					<input
						type="text"
						value={referralInput}
						onChange={(e) => setReferralInput(e.target.value)}
						placeholder="Enter referral code"
						className="flex-1 px-3 py-2.5 bg-[#0a0a0a] border border-[#2c2c2e] text-white rounded-xl text-sm outline-none focus:border-[rgba(0,200,83,0.3)] transition-colors placeholder:text-[#8E8E93]/50"
					/>
					<button
						type="button"
						onClick={handleReferral}
						className="px-4 py-2.5 bg-[#1c1c1e] border border-[#2c2c2e] text-white rounded-xl text-xs font-semibold"
					>
						Apply
					</button>
				</div>
				{referralMsg && <p className="text-xs text-[#00C853] mt-2">{referralMsg}</p>}
			</div>

			{/* Sync Button */}
			<button
				type="button"
				className="w-full py-3.5 rounded-[16px] bg-[#00C853] text-black font-bold text-sm shadow-[0_0_20px_rgba(0,200,83,0.2)] active:scale-[0.98] transition-transform"
			>
				Sync Fitness Data
			</button>
		</div>
	);
}
