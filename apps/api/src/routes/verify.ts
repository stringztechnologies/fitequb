import { createHash } from "node:crypto";
import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const QR_SECRET = process.env.QR_SECRET ?? "fitequb-qr-secret-v1";

const verify = new Hono<{ Variables: AppVariables }>();

// Helper: get user ID from telegram_id
async function getUserId(telegramId: number): Promise<string | null> {
	const { data } = await supabase
		.from("users")
		.select("id")
		.eq("telegram_id", telegramId)
		.single();
	return data?.id ?? null;
}

// Helper: get today's date string in YYYY-MM-DD
function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}

// Helper: update daily verification summary
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
		const methods = Array.isArray(existing.methods_used) ? existing.methods_used : [];
		if (!methods.includes(method)) methods.push(method);
		const totalPoints = (existing.total_points ?? 0) + points;
		const isComplete = totalPoints >= 50;

		await supabase
			.from("daily_verification_summary")
			.update({
				total_points: totalPoints,
				methods_used: methods,
				is_day_complete: isComplete,
			})
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

// Helper: haversine distance in meters
function haversineDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number {
	const R = 6371000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 1. POST /verify/steps
verify.post("/steps", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const body = await c.req.json<{ steps: number; date?: string }>();
	const steps = body.steps;

	if (typeof steps !== "number" || steps < 0 || steps > 100000) {
		return c.json({ data: null, error: "Steps must be between 0 and 100,000" }, 400);
	}

	const points = 20;
	const date = body.date ?? todayStr();

	await supabase.from("workout_verifications").insert({
		user_id: userId,
		type: "steps",
		points,
		metadata: { steps, date },
		verified_at: new Date().toISOString(),
	});

	// Also award gamification points
	await supabase.from("point_events").insert({
		user_id: userId,
		points,
		reason: `Logged ${steps} steps`,
	});

	// Update user total points
	await supabase.rpc("increment_points", { uid: userId, pts: points }).catch(() => {
		// fallback: manual update
		supabase
			.from("users")
			.select("total_points")
			.eq("id", userId)
			.single()
			.then(({ data: u }) => {
				if (u) {
					supabase
						.from("users")
						.update({ total_points: (u.total_points ?? 0) + points })
						.eq("id", userId);
				}
			});
	});

	const summary = await updateDailySummary(userId, "steps", points);

	return c.json({
		data: {
			points,
			total_today: summary.total_points,
			day_complete: summary.is_day_complete,
		},
		error: null,
	});
});

// 2. POST /verify/qr
verify.post("/qr", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const body = await c.req.json<{ qr_code: string }>();
	if (!body.qr_code?.trim()) {
		return c.json({ data: null, error: "QR code is required" }, 400);
	}

	// QR format: hash(gym_id + YYYY-MM-DD + QR_SECRET)
	// Try to match against all active gyms
	const { data: gyms } = await supabase
		.from("partner_gyms")
		.select("id, name")
		.eq("active", true);

	if (!gyms || gyms.length === 0) {
		return c.json({ data: null, error: "No partner gyms available" }, 404);
	}

	const today = todayStr();
	let matchedGym: { id: string; name: string } | null = null;

	for (const gym of gyms) {
		const expectedHash = createHash("sha256")
			.update(`${gym.id}${today}${QR_SECRET}`)
			.digest("hex");
		if (body.qr_code === expectedHash) {
			matchedGym = gym;
			break;
		}
	}

	if (!matchedGym) {
		return c.json({ data: null, error: "Invalid or expired QR code" }, 400);
	}

	const points = 40;

	await supabase.from("workout_verifications").insert({
		user_id: userId,
		type: "qr_scan",
		points,
		metadata: { gym_id: matchedGym.id, gym_name: matchedGym.name, date: today },
		verified_at: new Date().toISOString(),
	});

	await supabase.from("point_events").insert({
		user_id: userId,
		points,
		reason: `QR check-in at ${matchedGym.name}`,
	});

	await supabase.rpc("increment_points", { uid: userId, pts: points }).catch(() => {});

	const summary = await updateDailySummary(userId, "qr_scan", points);

	return c.json({
		data: {
			points,
			gym_name: matchedGym.name,
			total_today: summary.total_points,
		},
		error: null,
	});
});

// 3. POST /verify/photo
verify.post("/photo", async (c) => {
	const geminiKey = process.env.GEMINI_API_KEY;
	if (!geminiKey) {
		return c.json({ data: null, error: "Photo verification not configured" }, 503);
	}

	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const body = await c.req.json<{ image_base64: string }>();
	if (!body.image_base64?.trim()) {
		return c.json({ data: null, error: "Image is required" }, 400);
	}

	// Strip data URL prefix if present
	const base64Data = body.image_base64.replace(/^data:image\/\w+;base64,/, "");

	try {
		const res = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{
									inlineData: {
										mimeType: "image/jpeg",
										data: base64Data,
									},
								},
								{
									text: 'Analyze this image. Is the person at a gym or exercising? Look for gym equipment, workout clothes, outdoor exercise. Return JSON only: {"confidence": 0-100, "reasoning": "string"}',
								},
							],
						},
					],
					generationConfig: {
						maxOutputTokens: 256,
						temperature: 0.3,
					},
				}),
			},
		);

		if (!res.ok) {
			console.error("Gemini Vision error:", res.status, await res.text());
			return c.json({ data: null, error: "Photo analysis failed" }, 502);
		}

		const geminiData = await res.json();
		const rawText =
			geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

		// Extract JSON from response (may be wrapped in markdown code block)
		const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
		let confidence = 0;
		let reasoning = "Could not analyze image";

		if (jsonMatch) {
			try {
				const parsed = JSON.parse(jsonMatch[0]);
				confidence = Number(parsed.confidence) || 0;
				reasoning = parsed.reasoning || "No reasoning provided";
			} catch {
				reasoning = rawText.slice(0, 200);
			}
		}

		const verified = confidence >= 70;
		const points = verified ? 35 : 0;

		await supabase.from("workout_verifications").insert({
			user_id: userId,
			type: "photo",
			points,
			metadata: { confidence, reasoning, verified },
			verified_at: new Date().toISOString(),
		});

		if (verified) {
			await supabase.from("point_events").insert({
				user_id: userId,
				points,
				reason: `Photo workout verified (${confidence}% confidence)`,
			});
			await supabase.rpc("increment_points", { uid: userId, pts: points }).catch(() => {});
		}

		const summary = verified
			? await updateDailySummary(userId, "photo", points)
			: { total_points: 0, methods_used: [], is_day_complete: false };

		return c.json({
			data: {
				points,
				confidence,
				reasoning,
				verified,
				total_today: summary.total_points,
			},
			error: null,
		});
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

	const body = await c.req.json<{ buddy_user_id: string; equb_id: string }>();
	if (!body.buddy_user_id || !body.equb_id) {
		return c.json({ data: null, error: "buddy_user_id and equb_id are required" }, 400);
	}

	// Verify both users are in the same equb room
	const { data: members } = await supabase
		.from("equb_members")
		.select("user_id")
		.eq("equb_room_id", body.equb_id)
		.in("user_id", [userId, body.buddy_user_id]);

	if (!members || members.length < 2) {
		return c.json({ data: null, error: "Both users must be in the same Equb room" }, 400);
	}

	// Check or create buddy pair
	const { data: existingBuddy } = await supabase
		.from("workout_buddies")
		.select("id")
		.eq("equb_room_id", body.equb_id)
		.or(`and(user_id.eq.${userId},buddy_id.eq.${body.buddy_user_id}),and(user_id.eq.${body.buddy_user_id},buddy_id.eq.${userId})`)
		.single();

	if (!existingBuddy) {
		await supabase.from("workout_buddies").insert({
			equb_room_id: body.equb_id,
			user_id: userId,
			buddy_id: body.buddy_user_id,
		});
	}

	const points = 25;

	// Award points to the buddy being confirmed (buddy_user_id)
	await supabase.from("workout_verifications").insert({
		user_id: body.buddy_user_id,
		type: "buddy",
		points,
		metadata: { confirmed_by: userId, equb_id: body.equb_id },
		verified_at: new Date().toISOString(),
	});

	await supabase.from("point_events").insert({
		user_id: body.buddy_user_id,
		points,
		reason: "Buddy workout confirmation",
	});

	await supabase.rpc("increment_points", { uid: body.buddy_user_id, pts: points }).catch(() => {});

	const summary = await updateDailySummary(body.buddy_user_id, "buddy", points);

	// Get confirmer name
	const { data: confirmer } = await supabase
		.from("users")
		.select("full_name")
		.eq("id", userId)
		.single();

	return c.json({
		data: {
			points,
			confirmed_by: confirmer?.full_name ?? "Your buddy",
			total_today: summary.total_points,
		},
		error: null,
	});
});

// 5. POST /verify/gps
verify.post("/gps", async (c) => {
	const telegramUser = c.get("telegramUser");
	const userId = await getUserId(telegramUser.id);
	if (!userId) return c.json({ data: null, error: "User not found" }, 404);

	const body = await c.req.json<{ lat: number; lng: number }>();
	if (typeof body.lat !== "number" || typeof body.lng !== "number") {
		return c.json({ data: null, error: "lat and lng are required" }, 400);
	}

	// Find nearby partner gyms
	const { data: gyms } = await supabase
		.from("partner_gyms")
		.select("id, name, latitude, longitude")
		.eq("active", true);

	if (!gyms || gyms.length === 0) {
		return c.json({ data: null, error: "No partner gyms available" }, 404);
	}

	let closestGym: { id: string; name: string } | null = null;
	let closestDistance = Number.POSITIVE_INFINITY;

	for (const gym of gyms) {
		if (gym.latitude == null || gym.longitude == null) continue;
		const dist = haversineDistance(body.lat, body.lng, gym.latitude, gym.longitude);
		if (dist < closestDistance) {
			closestDistance = dist;
			closestGym = { id: gym.id, name: gym.name };
		}
	}

	if (!closestGym || closestDistance > 50) {
		return c.json({
			data: null,
			error: `Not close enough to any partner gym. Nearest is ${closestDistance < Number.POSITIVE_INFINITY ? `${Math.round(closestDistance)}m away` : "unknown"}`,
		}, 400);
	}

	const points = 30;

	await supabase.from("workout_verifications").insert({
		user_id: userId,
		type: "gps",
		points,
		metadata: {
			lat: body.lat,
			lng: body.lng,
			gym_id: closestGym.id,
			gym_name: closestGym.name,
			distance_m: Math.round(closestDistance),
		},
		verified_at: new Date().toISOString(),
	});

	await supabase.from("point_events").insert({
		user_id: userId,
		points,
		reason: `GPS check-in near ${closestGym.name}`,
	});

	await supabase.rpc("increment_points", { uid: userId, pts: points }).catch(() => {});

	const summary = await updateDailySummary(userId, "gps", points);

	return c.json({
		data: {
			points,
			gym_name: closestGym.name,
			distance_m: Math.round(closestDistance),
			total_today: summary.total_points,
		},
		error: null,
	});
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

	if (!summary) {
		return c.json({
			data: {
				total_points: 0,
				methods_used: [],
				is_day_complete: false,
				threshold: 50,
			},
			error: null,
		});
	}

	return c.json({
		data: {
			total_points: summary.total_points ?? 0,
			methods_used: summary.methods_used ?? [],
			is_day_complete: summary.is_day_complete ?? false,
			threshold: 50,
		},
		error: null,
	});
});

export { verify };
