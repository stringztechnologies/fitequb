import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading.js";
import { api } from "../lib/api.js";

interface AdminStats {
	overview: {
		totalUsers: number;
		totalMembers: number;
		totalWorkouts: number;
		totalChallengeParticipants: number;
	};
	rooms: {
		pending: number;
		active: number;
		settled: number;
		total: number;
	};
	revenue: {
		totalStaked: number;
		totalPaidOut: number;
		totalFees: number;
		totalDayPassRevenue: number;
		netRevenue: number;
	};
	dayPasses: {
		total: number;
		active: number;
		redeemed: number;
	};
	recentUsers: Array<{
		id: string;
		full_name: string;
		username: string | null;
		created_at: string;
	}>;
	recentTransactions: Array<{
		id: string;
		type: string;
		amount: number;
		tx_ref: string;
		created_at: string;
	}>;
	activeRooms: Array<{
		id: string;
		name: string;
		status: string;
		stakeAmount: number;
		maxMembers: number;
		roomType: string;
		tier: string;
		createdAt: string;
	}>;
}

// Demo data for when API is unavailable
const DEMO_STATS: AdminStats = {
	overview: { totalUsers: 47, totalMembers: 38, totalWorkouts: 215, totalChallengeParticipants: 128 },
	rooms: { pending: 2, active: 3, settled: 1, total: 6 },
	revenue: { totalStaked: 45000, totalPaidOut: 32000, totalFees: 4500, totalDayPassRevenue: 8400, netRevenue: 12900 },
	dayPasses: { total: 56, active: 4, redeemed: 48 },
	recentUsers: [
		{ id: "1", full_name: "Dawit Abraham", username: "dawit_a", created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
		{ id: "2", full_name: "Selam Tadesse", username: "selam_t", created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
		{ id: "3", full_name: "Kebede Belay", username: null, created_at: new Date(Date.now() - 12 * 3600000).toISOString() },
		{ id: "4", full_name: "Hana Mulugeta", username: "hana_m", created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
		{ id: "5", full_name: "Yonas Girma", username: "yonas_g", created_at: new Date(Date.now() - 36 * 3600000).toISOString() },
	],
	recentTransactions: [
		{ id: "1", type: "stake", amount: 500, tx_ref: "TX-EQB-001", created_at: new Date(Date.now() - 1800000).toISOString() },
		{ id: "2", type: "day_pass_purchase", amount: 150, tx_ref: "TX-GYM-001", created_at: new Date(Date.now() - 3600000).toISOString() },
		{ id: "3", type: "stake", amount: 1000, tx_ref: "TX-EQB-002", created_at: new Date(Date.now() - 7200000).toISOString() },
		{ id: "4", type: "payout", amount: 12000, tx_ref: "TX-PAY-001", created_at: new Date(Date.now() - 14400000).toISOString() },
		{ id: "5", type: "fee", amount: 450, tx_ref: "TX-FEE-001", created_at: new Date(Date.now() - 18000000).toISOString() },
	],
	activeRooms: [
		{ id: "r1", name: "Bole Elite 10k", status: "active", stakeAmount: 500, maxMembers: 20, roomType: "public", tier: "elite", createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
		{ id: "r2", name: "Sarbet Steppers", status: "active", stakeAmount: 1000, maxMembers: 20, roomType: "private", tier: "regular", createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
		{ id: "r3", name: "Morning Movers", status: "pending", stakeAmount: 250, maxMembers: 15, roomType: "public", tier: "starter", createdAt: new Date(Date.now() - 86400000).toISOString() },
	],
};

export function AdminDashboard() {
	const [stats, setStats] = useState<AdminStats | null>(null);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		api<AdminStats>("/api/admin/stats")
			.then((res) => {
				setStats(res.data ?? DEMO_STATS);
			})
			.catch(() => setStats(DEMO_STATS))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;
	if (!stats) return null;

	const { overview, rooms, revenue, dayPasses, recentUsers, recentTransactions, activeRooms } = stats;

	return (
		<div className="bg-background text-on-surface font-body min-h-screen pb-32">
			{/* Header */}
			<header className="fixed top-0 w-full max-w-[430px] z-50 bg-[#131313]/70 backdrop-blur-xl flex items-center justify-between px-5 h-16">
				<button
					type="button"
					onClick={() => navigate(-1)}
					className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-all"
					aria-label="Go back"
				>
					<span className="material-symbols-outlined text-on-surface-variant text-xl">arrow_back</span>
				</button>
				<h1 className="font-headline font-bold text-lg text-on-surface">Admin Dashboard</h1>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-all"
					aria-label="Refresh"
				>
					<span className="material-symbols-outlined text-on-surface-variant text-xl">refresh</span>
				</button>
			</header>
			<div className="h-16" />

			<div className="px-5 pt-4 space-y-6">
				{/* KPI Cards */}
				<div className="grid grid-cols-2 gap-3">
					<KPICard icon="group" label="Total Users" value={overview.totalUsers} color="primary" />
					<KPICard icon="payments" label="Net Revenue" value={`${revenue.netRevenue.toLocaleString()} ETB`} color="secondary-container" />
					<KPICard icon="meeting_room" label="Active Rooms" value={rooms.active} color="primary" />
					<KPICard icon="fitness_center" label="Workouts" value={overview.totalWorkouts} color="tertiary" />
				</div>

				{/* Revenue Breakdown */}
				<section>
					<h2 className="font-headline text-lg font-bold mb-3">Revenue</h2>
					<div className="bg-surface-container-low rounded-lg p-5 space-y-3 border border-outline-variant/10">
						<RevenueRow label="Total Staked" amount={revenue.totalStaked} icon="savings" color="text-primary" />
						<RevenueRow label="Paid Out" amount={revenue.totalPaidOut} icon="output" color="text-on-surface-variant" />
						<RevenueRow label="Platform Fees" amount={revenue.totalFees} icon="receipt_long" color="text-secondary-container" />
						<RevenueRow label="Day Pass Sales" amount={revenue.totalDayPassRevenue} icon="confirmation_number" color="text-secondary-container" />
						<div className="border-t border-outline-variant/20 pt-3">
							<RevenueRow label="Net Revenue" amount={revenue.netRevenue} icon="trending_up" color="text-primary" bold />
						</div>
					</div>
				</section>

				{/* Room Stats */}
				<section>
					<h2 className="font-headline text-lg font-bold mb-3">Rooms</h2>
					<div className="grid grid-cols-4 gap-2">
						<StatPill label="Total" value={rooms.total} />
						<StatPill label="Pending" value={rooms.pending} color="text-secondary-container" />
						<StatPill label="Active" value={rooms.active} color="text-primary" />
						<StatPill label="Settled" value={rooms.settled} color="text-on-surface-variant" />
					</div>
				</section>

				{/* Active Rooms List */}
				{activeRooms.length > 0 && (
					<section>
						<h2 className="font-headline text-lg font-bold mb-3">Live Rooms</h2>
						<div className="space-y-2">
							{activeRooms.map((room) => (
								<button
									type="button"
									key={room.id}
									onClick={() => navigate(`/equbs/${room.id}`)}
									className="w-full bg-surface-container-low rounded-lg p-4 flex items-center justify-between text-left active:scale-[0.98] transition-transform"
								>
									<div className="flex items-center gap-3 min-w-0">
										<div className={`w-2 h-2 rounded-full shrink-0 ${room.status === "active" ? "bg-primary" : "bg-secondary-container"}`} />
										<div className="min-w-0">
											<p className="font-headline text-sm font-bold text-on-surface truncate">{room.name}</p>
											<p className="font-label text-2xs text-on-surface-variant uppercase tracking-wider">
												{room.roomType} &middot; {room.tier} &middot; {room.maxMembers} max
											</p>
										</div>
									</div>
									<span className="font-label text-xs text-primary font-bold shrink-0 ml-2">
										{room.stakeAmount} ETB
									</span>
								</button>
							))}
						</div>
					</section>
				)}

				{/* Day Passes */}
				<section>
					<h2 className="font-headline text-lg font-bold mb-3">Day Passes</h2>
					<div className="grid grid-cols-3 gap-2">
						<StatPill label="Sold" value={dayPasses.total} />
						<StatPill label="Active" value={dayPasses.active} color="text-primary" />
						<StatPill label="Used" value={dayPasses.redeemed} color="text-secondary-container" />
					</div>
				</section>

				{/* Recent Signups */}
				<section>
					<h2 className="font-headline text-lg font-bold mb-3">Recent Signups</h2>
					<div className="space-y-2">
						{recentUsers.map((u) => (
							<div key={u.id} className="bg-surface-container rounded-lg px-4 py-3 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
										<span className="font-headline text-sm font-bold text-primary">{u.full_name.charAt(0)}</span>
									</div>
									<div>
										<p className="font-body text-sm font-medium text-on-surface">{u.full_name}</p>
										{u.username && <p className="font-label text-2xs text-on-surface-variant">@{u.username}</p>}
									</div>
								</div>
								<span className="font-label text-2xs text-on-surface-variant">{timeAgo(u.created_at)}</span>
							</div>
						))}
					</div>
				</section>

				{/* Recent Transactions */}
				<section>
					<h2 className="font-headline text-lg font-bold mb-3">Recent Transactions</h2>
					<div className="space-y-2">
						{recentTransactions.map((tx) => {
							const isIncome = tx.type === "stake" || tx.type === "fee" || tx.type === "day_pass_purchase";
							return (
								<div key={tx.id} className="bg-surface-container rounded-lg px-4 py-3 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className={`w-9 h-9 rounded-full flex items-center justify-center ${isIncome ? "bg-primary/10" : "bg-secondary-container/10"}`}>
											<span className={`material-symbols-outlined text-lg ${isIncome ? "text-primary" : "text-secondary-container"}`}>
												{tx.type === "stake" ? "savings" : tx.type === "payout" ? "output" : tx.type === "fee" ? "receipt_long" : "confirmation_number"}
											</span>
										</div>
										<div>
											<p className="font-body text-sm font-medium text-on-surface capitalize">{tx.type.replace("_", " ")}</p>
											<p className="font-label text-2xs text-on-surface-variant">{tx.tx_ref}</p>
										</div>
									</div>
									<div className="text-right">
										<p className={`font-headline text-sm font-bold ${isIncome ? "text-primary" : "text-on-surface-variant"}`}>
											{isIncome ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()} ETB
										</p>
										<p className="font-label text-2xs text-on-surface-variant">{timeAgo(tx.created_at)}</p>
									</div>
								</div>
							);
						})}
					</div>
				</section>
			</div>
		</div>
	);
}

function KPICard({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
	return (
		<div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/10">
			<div className="flex items-center gap-2 mb-2">
				<span className={`material-symbols-outlined text-${color} text-lg`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
				<span className="font-label text-2xs text-on-surface-variant uppercase tracking-widest">{label}</span>
			</div>
			<p className={`font-headline text-2xl font-bold text-${color}`}>{typeof value === "number" ? value.toLocaleString() : value}</p>
		</div>
	);
}

function RevenueRow({ label, amount, icon, color, bold }: { label: string; amount: number; icon: string; color: string; bold?: boolean }) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<span className={`material-symbols-outlined text-base ${color}`}>{icon}</span>
				<span className={`font-body text-sm ${bold ? "font-bold text-on-surface" : "text-on-surface-variant"}`}>{label}</span>
			</div>
			<span className={`font-headline text-sm ${bold ? "font-bold" : ""} ${color}`}>{amount.toLocaleString()} ETB</span>
		</div>
	);
}

function StatPill({ label, value, color }: { label: string; value: number; color?: string }) {
	return (
		<div className="bg-surface-container rounded-lg p-3 text-center">
			<p className={`font-headline text-xl font-bold ${color ?? "text-on-surface"}`}>{value}</p>
			<p className="font-label text-2xs text-on-surface-variant uppercase tracking-widest mt-0.5">{label}</p>
		</div>
	);
}

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}
