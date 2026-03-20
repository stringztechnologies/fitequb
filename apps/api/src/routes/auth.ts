import type { ApiResponse, User } from "@fitequb/shared";
import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const auth = new Hono<{ Variables: AppVariables }>();

/**
 * POST /auth/login
 * Called after TMA opens and initData is validated by middleware.
 * Upserts user in Supabase and returns user record.
 */
auth.post("/login", async (c) => {
	const telegramUser = c.get("telegramUser");

	const fullName = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ");

	const { data, error } = await supabase
		.from("users")
		.upsert(
			{
				telegram_id: telegramUser.id,
				full_name: fullName,
				username: telegramUser.username ?? null,
			},
			{ onConflict: "telegram_id" },
		)
		.select()
		.single();

	if (error) {
		return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
	}

	return c.json<ApiResponse<User>>({ data: data as User, error: null });
});

export { auth };
