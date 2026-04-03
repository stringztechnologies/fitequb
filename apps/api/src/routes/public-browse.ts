import type { ApiResponse, Challenge, EqubRoom, PartnerGym } from "@fitequb/shared";
import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import { rateLimit } from "../middleware/rate-limit.js";

const publicBrowse = new Hono();

// --- Equb Rooms ---

// GET /public/equb-rooms — list all active/pending rooms (no auth)
publicBrowse.get("/equb-rooms", async (c) => {
	const status = c.req.query("status");

	let query = supabase
		.from("equb_rooms")
		.select("*")
		.order("created_at", { ascending: false })
		.limit(50);

	if (status) {
		query = query.eq("status", status);
	}

	const { data, error } = await query;

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json<ApiResponse<EqubRoom[]>>({
		data: data as EqubRoom[],
		error: null,
	});
});

// GET /public/equb-rooms/:id — room detail with members (no auth)
publicBrowse.get("/equb-rooms/:id", async (c) => {
	const roomId = c.req.param("id");

	const [roomResult, membersResult] = await Promise.all([
		supabase.from("equb_rooms").select("*").eq("id", roomId).single(),
		supabase.from("equb_members").select("*, users(full_name, username)").eq("room_id", roomId),
	]);

	if (roomResult.error) {
		return c.json<ApiResponse<null>>({ data: null, error: "Room not found" }, 404);
	}

	return c.json({
		data: {
			room: roomResult.data,
			members: membersResult.data ?? [],
		},
		error: null,
	});
});

// --- Gyms ---

// GET /public/gyms — list active partner gyms (no auth)
publicBrowse.get("/gyms", async (c) => {
	const { data, error } = await supabase
		.from("partner_gyms")
		.select("*")
		.eq("active", true)
		.order("name");

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json<ApiResponse<PartnerGym[]>>({
		data: data as PartnerGym[],
		error: null,
	});
});

// --- Challenges ---

// GET /public/challenges — list active challenges (no auth)
publicBrowse.get("/challenges", async (c) => {
	const { data, error } = await supabase
		.from("challenges")
		.select("*")
		.gte("end_date", new Date().toISOString())
		.order("start_date");

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json<ApiResponse<Challenge[]>>({ data: data as Challenge[], error: null });
});

// GET /public/challenges/:id/leaderboard — ranked participants (no auth)
publicBrowse.get("/challenges/:id/leaderboard", async (c) => {
	const challengeId = c.req.param("id");

	const { data, error } = await supabase
		.from("challenge_participants")
		.select("*, users(full_name, username)")
		.eq("challenge_id", challengeId)
		.order("total_steps", { ascending: false })
		.limit(50);

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json({ data, error: null });
});

// --- Gamification ---

// GET /public/gamification/leaderboard — top users by points (no auth)
publicBrowse.get("/gamification/leaderboard", async (c) => {
	const { data, error } = await supabase
		.from("users")
		.select("id, full_name, username, total_points, level")
		.order("total_points", { ascending: false })
		.limit(50);

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json({ data, error: null });
});

// --- AI Coach ---

// 20 requests per minute (by IP for unauthenticated users)
publicBrowse.use("/ai/coach", rateLimit(20, 60 * 1000));

const SYSTEM_PROMPT = `You are FitEqub Coach, a fitness advisor for young professionals in Addis Ababa, Ethiopia. Keep responses to 2-3 sentences. Be encouraging and motivational. Know about Orthodox fasting (Tsom) and Ethiopian food (injera, shiro, tibs). Suggest fasting-friendly exercises during Tsom periods. Reference local gyms and walking routes in Addis (Bole, Meskel Square, Entoto hills, Churchill Avenue). Speak casually like a friend, not a doctor. If the user asks non-fitness questions, gently redirect to fitness topics. Use ETB for money references. If the user mentions their Equb, encourage them to hit their step targets.`;

// POST /public/ai/coach — AI coach for everyone (no auth)
publicBrowse.post("/ai/coach", async (c) => {
	const geminiKey = process.env.GEMINI_API_KEY;
	if (!geminiKey) {
		return c.json({ data: null, error: "AI coach not configured" }, 503);
	}

	const body = await c.req.json<{
		message: string;
		history?: Array<{ role: string; text: string }>;
	}>();
	if (!body.message?.trim()) {
		return c.json({ data: null, error: "Message is required" }, 400);
	}

	const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

	if (body.history) {
		for (const msg of body.history.slice(-10)) {
			contents.push({
				role: msg.role === "user" ? "user" : "model",
				parts: [{ text: msg.text }],
			});
		}
	}

	contents.push({
		role: "user",
		parts: [{ text: body.message }],
	});

	try {
		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents,
					systemInstruction: {
						parts: [{ text: SYSTEM_PROMPT }],
					},
					generationConfig: {
						maxOutputTokens: 256,
						temperature: 0.8,
					},
				}),
			},
		);

		if (!res.ok) {
			const errText = await res.text();
			console.error("Gemini API error:", res.status, errText);
			return c.json({ data: null, error: "AI coach is temporarily unavailable" }, 502);
		}

		const data = await res.json();
		const reply =
			data?.candidates?.[0]?.content?.parts?.[0]?.text ??
			"I'm having trouble thinking right now. Try again!";

		return c.json({ data: { reply }, error: null });
	} catch (err) {
		console.error("Gemini fetch error:", err);
		return c.json({ data: null, error: "Failed to reach AI coach" }, 502);
	}
});

export { publicBrowse };
