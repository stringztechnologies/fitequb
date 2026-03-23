import { createHash } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const QR_SECRET = process.env.QR_SECRET ?? "fitequb-qr-secret-v1";
const MAX_DAILY_ATTEMPTS = 10;

const verify = new Hono<{ Variables: AppVariables }>();

// --- Zod Schemas ---
const stepsSchema = z.object({
	steps: z.number().int().min(0).max(100000),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const qrSchema = z.object({
	qr_code: z.string().min(1).max(128),
});

const photoSchema = z.object({
	image_base64: z.string().min(100),
});

const buddySchema = z.object({
	buddy_user_id: z.string().uuid(),
	equb_id: z.string().uuid(),
});

const gpsSchema = z.object({
	lat: z.number().min(-90).max(90),
	lng: z.number().min(-180).max(180),
});

// --- Helpers ---

async function getUserId(telegramId: number): Promise<string | null> {
	const { data } = await supabase
		.from("users")
		.select("id")
		.eq("telegram_id", telegramId)
		.single();
	return data?.id ?? null;
}

function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}

async function checkRateLimit(userId: string): Promise<boolean> {
	const today = todayStr();
	const { count } = await supabase
		.from("workout_verifications")
		.select("id", { count: "exact", head: true })
		.eq("user_id", userId)
		.gte("verified_at", `${today}T00:00:00`)
		.lte("verified_at", `${today}T23:59:59`);
	return (count ?? 0) < MAX_DAILY_ATTEMPTS;
}

async function updateDailySummary(
	userId: string,
	method: string,
	points: number,
): Promise<{ total_points: number; methods_used: string[]; is_day_complete: boolean }> {
	const today = todayStr();

	const { data: existing } = await supabase
		.from("daily_verification_summary")
		.select("*")
		.eq("user_id", userId)
		.eq("date", today)
		.single();

	if (existing) {
		const methods = Array.isArray(existing.methods_used) ? [...existing.methods_used] : [];
		if (!methods.includes(method)) methods.push(method);
		const totalPoints = (existing.total_points ?? 0) + points;
		const isComplete = totalPoints >= 50;

		await supabase
			.from("daily_verification_summary")
			.update({ total_points: totalPoints, methods_used: methods, is_day_complete: isComplete })
			.eq("id", existing.id);

		return { total_points: totalPoints, methods_used: methods, is_day_complete: isComplete };
	}

	const methods = [method];
	const isComplete = points >= 50;

	await supabase.from("daily_verification_summary").insert({
		user_id: userId,
		date: today,
		total_points: points,
		methods_used: methods,
		is_day_complete: isComplete,
	});

	return { total_points: points, methods_used: methods, is_day_complete: isComplete };
}

async function awardPoints(userId: string, points: number, reason: string) {
	await supabase.from("point_events").insert({ user_id: userId, points, reason });
	const { error } = await supabase.rpc("increment_points", { uid: userId, pts: points });
	if (error) {
		const { data: u } = await supabase.from("users").select("total_points").eq("id", userId).single();
		if (u) {
			await supabase.from("users").update({ total_points: (u.total_points ?? 0) + points }).eq("id", userId);
		}
	}
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Endpoints ---

// 1. POST /verify/steps
verify.post("/steps", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const parsed = stepsSchema.safeParse(await c.req.json());
	if (!parsed.success) return c.json({ data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);

	if (!(await checkRateLimit(userId))) {
		return c.json({ data: null, error: "Daily verification limit reached (max 10)" }, 429);
	}

	const { steps, date } = parsed.data;
	const points = 20;

	await supabase.from("workout_verifications").insert({
		user_id: userId, type: "steps", points,
		metadata: { steps, date: date ?? todayStr() },
		verified_at: new Date().toISOString(),
	});

	await awardPoints(userId, points, `Logged ${steps} steps`);
	const summary = await updateDailySummary(userId, "steps", points);

	return c.json({ data: { points, total_today: summary.total_points, day_complete: summary.is_day_complete }, error: null });
});

// 2. POST /verify/qr
verify.post("/qr", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const parsed = qrSchema.safeParse(await c.req.json());
	if (!parsed.success) return c.json({ data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);

	if (!(await checkRateLimit(userId))) {
		return c.json({ data: null, error: "Daily verification limit reached (max 10)" }, 429);
	}

	const { data: gyms } = await supabase.from("partner_gyms").select("id, name").eq("active", true);
	if (!gyms?.length) return c.json({ data: null, error: "No partner gyms available" }, 404);

	const today = todayStr();
	let matchedGym: { id: string; name: string } | null = null;

	for (const gym of gyms) {
		const expectedHash = createHash("sha256").update(`${gym.id}${today}${QR_SECRET}`).digest("hex").slice(0, 12);
		if (parsed.data.qr_code === expectedHash) { matchedGym = gym; break; }
	}

	if (!matchedGym) return c.json({ data: null, error: "Invalid or expired QR code" }, 400);

	const points = 40;
	await supabase.from("workout_verifications").insert({
		user_id: userId, type: "qr_scan", points,
		metadata: { gym_id: matchedGym.id, gym_name: matchedGym.name, date: today },
		verified_at: new Date().toISOString(),
	});

	await awardPoints(userId, points, `QR check-in at ${matchedGym.name}`);
	const summary = await updateDailySummary(userId, "qr_scan", points);

	return c.json({ data: { points, gym_name: matchedGym.name, total_today: summary.total_points }, error: null });
});

// 3. POST /verify/photo
verify.post("/photo", async (c) => {
	const geminiKey = process.env.GEMINI_API_KEY;
	if (!geminiKey) return c.json({ data: null, error: "Photo verification not configured" }, 503);

	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const parsed = photoSchema.safeParse(await c.req.json());
	if (!parsed.success) return c.json({ data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);

	if (!(await checkRateLimit(userId))) {
		return c.json({ data: null, error: "Daily verification limit reached (max 10)" }, 429);
	}

	const base64Data = parsed.data.image_base64.replace(/^data:image\/\w+;base64,/, "");

	try {
		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [{
						parts: [
							{ inlineData: { mimeType: "image/jpeg", data: base64Data } },
							{ text: 'Analyze this image. Is the person at a gym or exercising? Look for gym equipment, workout clothes, outdoor exercise. Return JSON only: {"confidence": 0-100, "reasoning": "string"}' },
						],
					}],
					generationConfig: { maxOutputTokens: 256, temperature: 0.3 },
				}),
			},
		);

		if (!res.ok) {
			console.error("Gemini Vision error:", res.status, await res.text());
			return c.json({ data: null, error: "Photo analysis failed" }, 502);
		}

		const geminiData = await res.json();
		const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
		const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
		let confidence = 0;
		let reasoning = "Could not analyze image";

		if (jsonMatch) {
			try {
				const p = JSON.parse(jsonMatch[0]);
				confidence = Number(p.confidence) || 0;
				reasoning = p.reasoning || "No reasoning provided";
			} catch { reasoning = rawText.slice(0, 200); }
		}

		const verified = confidence >= 70;
		const points = verified ? 35 : 0;

		await supabase.from("workout_verifications").insert({
			user_id: userId, type: "photo", points,
			metadata: { confidence, reasoning, verified },
			verified_at: new Date().toISOString(),
		});

		if (verified) await awardPoints(userId, points, `Photo workout verified (${confidence}%)`);
		const summary = verified ? await updateDailySummary(userId, "photo", points) : { total_points: 0, methods_used: [], is_day_complete: false };

		return c.json({ data: { points, confidence, reasoning, verified, total_today: summary.total_points }, error: null });
	} catch (err) {
		console.error("Photo verification error:", err);
		return c.json({ data: null, error: "Photo analysis failed" }, 502);
	}
});

// 4. POST /verify/buddy
verify.post("/buddy", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const parsed = buddySchema.safeParse(await c.req.json());
	if (!parsed.success) return c.json({ data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);

	if (!(await checkRateLimit(userId))) {
		return c.json({ data: null, error: "Daily verification limit reached (max 10)" }, 429);
	}

	const { buddy_user_id, equb_id } = parsed.data;

	const { data: members } = await supabase
		.from("equb_members")
		.select("user_id")
		.eq("equb_room_id", equb_id)
		.in("user_id", [userId, buddy_user_id]);

	if (!members || members.length < 2) {
		return c.json({ data: null, error: "Both users must be in the same Equb room" }, 400);
	}

	const { data: existingBuddy } = await supabase
		.from("workout_buddies")
		.select("id")
		.eq("equb_room_id", equb_id)
		.or(`and(user_id.eq.${userId},buddy_id.eq.${buddy_user_id}),and(user_id.eq.${buddy_user_id},buddy_id.eq.${userId})`)
		.single();

	if (!existingBuddy) {
		await supabase.from("workout_buddies").insert({ equb_room_id: equb_id, user_id: userId, buddy_id: buddy_user_id });
	}

	const points = 25;
	await supabase.from("workout_verifications").insert({
		user_id: buddy_user_id, type: "buddy", points,
		metadata: { confirmed_by: userId, equb_id },
		verified_at: new Date().toISOString(),
	});

	await awardPoints(buddy_user_id, points, "Buddy workout confirmation");
	const summary = await updateDailySummary(buddy_user_id, "buddy", points);

	const { data: confirmer } = await supabase.from("users").select("full_name").eq("id", userId).single();

	return c.json({ data: { points, confirmed_by: confirmer?.full_name ?? "Your buddy", total_today: summary.total_points }, error: null });
});

// 5. POST /verify/gps
verify.post("/gps", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const parsed = gpsSchema.safeParse(await c.req.json());
	if (!parsed.success) return c.json({ data: null, error: parsed.error.issues[0]?.message ?? "Validation error" }, 400);

	if (!(await checkRateLimit(userId))) {
		return c.json({ data: null, error: "Daily verification limit reached (max 10)" }, 429);
	}

	const { lat, lng } = parsed.data;
	const { data: gyms } = await supabase.from("partner_gyms").select("id, name, latitude, longitude").eq("active", true);
	if (!gyms?.length) return c.json({ data: null, error: "No partner gyms available" }, 404);

	let closestGym: { id: string; name: string } | null = null;
	let closestDistance = Number.POSITIVE_INFINITY;

	for (const gym of gyms) {
		if (gym.latitude == null || gym.longitude == null) continue;
		const dist = haversineDistance(lat, lng, gym.latitude, gym.longitude);
		if (dist < closestDistance) { closestDistance = dist; closestGym = { id: gym.id, name: gym.name }; }
	}

	if (!closestGym || closestDistance > 50) {
		return c.json({ data: null, error: `Not close enough to any partner gym${closestDistance < Number.POSITIVE_INFINITY ? `. Nearest: ${Math.round(closestDistance)}m away` : ""}` }, 400);
	}

	const points = 30;
	await supabase.from("workout_verifications").insert({
		user_id: userId, type: "gps", points,
		metadata: { lat, lng, gym_id: closestGym.id, gym_name: closestGym.name, distance_m: Math.round(closestDistance) },
		verified_at: new Date().toISOString(),
	});

	await awardPoints(userId, points, `GPS check-in near ${closestGym.name}`);
	const summary = await updateDailySummary(userId, "gps", points);

	return c.json({ data: { points, gym_name: closestGym.name, distance_m: Math.round(closestDistance), total_today: summary.total_points }, error: null });
});

// 6. GET /verify/daily-summary
verify.get("/daily-summary", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const today = todayStr();
	const { data: summary } = await supabase
		.from("daily_verification_summary")
		.select("*")
		.eq("user_id", userId)
		.eq("date", today)
		.single();

	return c.json({
		data: {
			total_points: summary?.total_points ?? 0,
			methods_used: summary?.methods_used ?? [],
			is_day_complete: summary?.is_day_complete ?? false,
			threshold: 50,
		},
		error: null,
	});
});

export { verify };
