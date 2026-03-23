import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";

const gymPublic = new Hono();

// POST /verify-pass — verify a day pass by QR token
gymPublic.post("/verify-pass", async (c) => {
	const { code } = await c.req.json<{ code: string }>();
	if (!code) return c.json({ data: null, error: "Code is required" }, 400);

	const { data: pass, error } = await supabase
		.from("day_passes")
		.select("*, partner_gyms(name, location), users(full_name)")
		.eq("qr_token", code)
		.single();

	if (error || !pass) {
		return c.json({ data: null, error: "Invalid pass code" }, 404);
	}

	return c.json({
		data: {
			id: pass.id,
			status: pass.status,
			userName: pass.users?.full_name ?? "Unknown",
			gymName: pass.partner_gyms?.name ?? "Unknown Gym",
			gymLocation: pass.partner_gyms?.location ?? "",
			purchasedAt: pass.purchased_at,
			expiresAt: pass.expires_at,
			redeemedAt: pass.redeemed_at,
		},
		error: null,
	});
});

// POST /redeem-pass — redeem a day pass by QR token
gymPublic.post("/redeem-pass", async (c) => {
	const { code } = await c.req.json<{ code: string }>();
	if (!code) return c.json({ data: null, error: "Code is required" }, 400);

	// Check pass exists and is active
	const { data: pass } = await supabase
		.from("day_passes")
		.select("id, status, redeemed_at")
		.eq("qr_token", code)
		.single();

	if (!pass) return c.json({ data: null, error: "Invalid pass code" }, 404);
	if (pass.status === "redeemed")
		return c.json({ data: null, error: "Already redeemed" }, 400);
	if (pass.status === "expired")
		return c.json({ data: null, error: "Pass expired" }, 400);

	const { error } = await supabase
		.from("day_passes")
		.update({ status: "redeemed", redeemed_at: new Date().toISOString() })
		.eq("id", pass.id);

	if (error) return c.json({ data: null, error: error.message }, 500);

	return c.json({ data: { redeemed: true }, error: null });
});

// GET /dashboard — gym dashboard secured by API key
gymPublic.get("/dashboard", async (c) => {
	const apiKey = c.req.query("key");
	if (!apiKey) return c.json({ data: null, error: "API key required" }, 401);

	// Find gym by dashboard_api_key
	const { data: gym } = await supabase
		.from("partner_gyms")
		.select("*")
		.eq("dashboard_api_key", apiKey)
		.single();

	if (!gym) return c.json({ data: null, error: "Invalid API key" }, 401);

	// Get passes for this gym
	const { data: passes } = await supabase
		.from("day_passes")
		.select("id, status, purchased_at, redeemed_at, users(full_name)")
		.eq("gym_id", gym.id)
		.order("purchased_at", { ascending: false })
		.limit(50);

	const allPasses = passes ?? [];
	const totalSold = allPasses.length;
	const totalRedeemed = allPasses.filter(
		(p) => p.status === "redeemed",
	).length;
	const revenue = totalSold * gym.app_day_pass;
	const gymPayout = Math.round(revenue * 0.7); // gym gets 70%

	return c.json({
		data: {
			gym: { id: gym.id, name: gym.name, location: gym.location },
			stats: { totalSold, totalRedeemed, revenue, gymPayout },
			recentPasses: allPasses.slice(0, 20).map((p) => ({
				id: p.id,
				status: p.status,
				userName: (p.users as any)?.full_name ?? "Unknown",
				purchasedAt: p.purchased_at,
				redeemedAt: p.redeemed_at,
			})),
		},
		error: null,
	});
});

export { gymPublic };
