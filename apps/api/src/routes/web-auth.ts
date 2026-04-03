import type { ApiResponse, User } from "@fitequb/shared";
import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { rateLimit } from "../middleware/rate-limit.js";

const webAuth = new Hono();

// 10 requests per minute
webAuth.use("/register", rateLimit(10, 60 * 1000));

const registerSchema = z.object({
	supabase_uid: z.string().uuid(),
	full_name: z.string().min(1).max(100),
	email: z.string().email().nullable().optional(),
	phone: z.string().max(20).nullable().optional(),
	trainer_code: z.string().max(20).optional(),
});

/**
 * POST /web-auth/register
 *
 * Called after Supabase Auth sign-up/sign-in to upsert the user
 * in the users table. Requires a valid Supabase JWT in the
 * Authorization header.
 */
webAuth.post("/register", async (c) => {
	const authHeader = c.req.header("authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return c.json<ApiResponse<null>>({ data: null, error: "Missing bearer token" }, 401);
	}

	const token = authHeader.slice(7);
	const {
		data: { user: supabaseUser },
		error: authError,
	} = await supabase.auth.getUser(token);

	if (authError || !supabaseUser) {
		return c.json<ApiResponse<null>>({ data: null, error: "Invalid token" }, 401);
	}

	const body = await c.req.json().catch(() => ({}));
	const parsed = registerSchema.safeParse(body);

	if (!parsed.success) {
		return c.json<ApiResponse<null>>(
			{
				data: null,
				error: parsed.error.issues.map((i) => i.message).join(", "),
			},
			400,
		);
	}

	// Verify the supabase_uid matches the token
	if (parsed.data.supabase_uid !== supabaseUser.id) {
		return c.json<ApiResponse<null>>({ data: null, error: "UID mismatch" }, 403);
	}

	const { data, error } = await supabase
		.from("users")
		.upsert(
			{
				supabase_uid: supabaseUser.id,
				full_name: parsed.data.full_name,
				email: parsed.data.email ?? supabaseUser.email ?? null,
				phone: parsed.data.phone ?? supabaseUser.phone ?? null,
			},
			{ onConflict: "supabase_uid" },
		)
		.select()
		.single();

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	// Link trainer if code provided
	if (parsed.data.trainer_code && !data.referred_by_trainer) {
		const { data: trainer } = await supabase
			.from("trainers")
			.select("id")
			.eq("affiliate_code", parsed.data.trainer_code.toUpperCase())
			.eq("status", "active")
			.single();

		if (trainer) {
			await supabase.from("users").update({ referred_by_trainer: trainer.id }).eq("id", data.id);
			data.referred_by_trainer = trainer.id;
		}
	}

	return c.json<ApiResponse<User>>({ data: data as User, error: null });
});

/**
 * GET /web-auth/me
 *
 * Fetch the current user profile using a Supabase JWT.
 * Used on page load to restore session.
 */
webAuth.get("/me", async (c) => {
	const authHeader = c.req.header("authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return c.json<ApiResponse<null>>({ data: null, error: "Missing bearer token" }, 401);
	}

	const token = authHeader.slice(7);
	const {
		data: { user: supabaseUser },
		error: authError,
	} = await supabase.auth.getUser(token);

	if (authError || !supabaseUser) {
		return c.json<ApiResponse<null>>({ data: null, error: "Invalid token" }, 401);
	}

	const { data, error } = await supabase
		.from("users")
		.select("*")
		.eq("supabase_uid", supabaseUser.id)
		.single();

	if (error || !data) {
		return c.json<ApiResponse<null>>({ data: null, error: "User not registered" }, 404);
	}

	return c.json<ApiResponse<User>>({ data: data as User, error: null });
});

export { webAuth };
