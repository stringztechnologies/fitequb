import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

// Admin Telegram IDs — from environment only
const adminId = Number(process.env.ADMIN_TELEGRAM_ID);
const ADMIN_IDS = new Set(adminId ? [adminId] : []);

const admin = new Hono<{ Variables: AppVariables }>();

// Admin gate middleware
admin.use("*", async (c, next) => {
	const user = c.get("telegramUser");
	if (!ADMIN_IDS.has(user.id)) {
		return c.json({ data: null, error: "Unauthorized" }, 403);
	}
	await next();
});

// GET /api/admin/stats — overview dashboard data
admin.get("/stats", async (c) => {
	try {
		const [
			usersRes,
			roomsRes,
			membersRes,
			ledgerRes,
			passesRes,
			workoutsRes,
			challengeParticipantsRes,
			recentUsersRes,
			recentLedgerRes,
		] = await Promise.all([
			// Total users
			supabase
				.from("users")
				.select("id", { count: "exact", head: true }),
			// Rooms by status
			supabase
				.from("equb_rooms")
				.select("id, status, room_type, tier, stake_amount, max_members, name, created_at"),
			// Total members
			supabase
				.from("equb_members")
				.select("id", { count: "exact", head: true }),
			// Ledger aggregates
			supabase
				.from("equb_ledger")
				.select("type, amount"),
			// Day passes
			supabase
				.from("day_passes")
				.select("id, status", { count: "exact" }),
			// Workouts today
			supabase
				.from("workouts")
				.select("id", { count: "exact", head: true }),
			// Challenge participants
			supabase
				.from("challenge_participants")
				.select("id", { count: "exact", head: true }),
			// Recent signups (last 10)
			supabase
				.from("users")
				.select("id, full_name, username, created_at")
				.order("created_at", { ascending: false })
				.limit(10),
			// Recent transactions (last 15)
			supabase
				.from("equb_ledger")
				.select("id, type, amount, tx_ref, created_at")
				.order("created_at", { ascending: false })
				.limit(15),
		]);

		// Compute stats
		const totalUsers = usersRes.count ?? 0;
		const totalMembers = membersRes.count ?? 0;
		const totalWorkouts = workoutsRes.count ?? 0;
		const totalChallengeParticipants = challengeParticipantsRes.count ?? 0;

		const rooms = roomsRes.data ?? [];
		const roomsByStatus = {
			pending: rooms.filter((r) => r.status === "pending").length,
			active: rooms.filter((r) => r.status === "active").length,
			settled: rooms.filter((r) => r.status === "settled").length,
			total: rooms.length,
		};

		const ledger = ledgerRes.data ?? [];
		const totalStaked = ledger
			.filter((e) => e.type === "stake")
			.reduce((sum, e) => sum + Math.abs(e.amount), 0);
		const totalPaidOut = ledger
			.filter((e) => e.type === "payout")
			.reduce((sum, e) => sum + Math.abs(e.amount), 0);
		const totalFees = ledger
			.filter((e) => e.type === "fee")
			.reduce((sum, e) => sum + Math.abs(e.amount), 0);
		const totalDayPassRevenue = ledger
			.filter((e) => e.type === "day_pass_purchase")
			.reduce((sum, e) => sum + Math.abs(e.amount), 0);

		const passes = passesRes.data ?? [];
		const dayPassStats = {
			total: passes.length,
			active: passes.filter((p) => p.status === "active").length,
			redeemed: passes.filter((p) => p.status === "redeemed").length,
		};

		return c.json({
			data: {
				overview: {
					totalUsers,
					totalMembers,
					totalWorkouts,
					totalChallengeParticipants,
				},
				rooms: roomsByStatus,
				revenue: {
					totalStaked,
					totalPaidOut,
					totalFees,
					totalDayPassRevenue,
					netRevenue: totalFees + totalDayPassRevenue,
				},
				dayPasses: dayPassStats,
				recentUsers: recentUsersRes.data ?? [],
				recentTransactions: recentLedgerRes.data ?? [],
				activeRooms: rooms
					.filter((r) => r.status === "active" || r.status === "pending")
					.map((r) => ({
						id: r.id,
						name: r.name,
						status: r.status,
						stakeAmount: r.stake_amount,
						maxMembers: r.max_members,
						roomType: r.room_type,
						tier: r.tier,
						createdAt: r.created_at,
					})),
			},
			error: null,
		});
	} catch (err) {
		return c.json({ data: null, error: "Failed to fetch admin stats" }, 500);
	}
});

export { admin };
