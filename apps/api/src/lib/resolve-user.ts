import type { Context } from "hono";
import type { AppVariables } from "../types/context.js";
import { supabase } from "./supabase.js";

/**
 * Resolve the internal user ID from the authenticated context.
 *
 * For Supabase auth: uses authenticatedUser.userId (pre-resolved in middleware).
 * For Telegram auth: looks up by telegram_id (existing behavior).
 *
 * Returns the user's internal UUID or null if not found.
 */
export async function resolveUserId(
	c: Context<{ Variables: AppVariables }>,
): Promise<string | null> {
	const auth = c.get("authenticatedUser");

	// Supabase auth — userId was resolved in middleware
	if (auth?.authMethod === "supabase" && auth.userId) {
		return auth.userId;
	}

	// Telegram auth — look up by telegram_id
	const telegramUser = c.get("telegramUser");
	if (!telegramUser?.id || telegramUser.id === 0) return null;

	const { data: user } = await supabase
		.from("users")
		.select("id")
		.eq("telegram_id", telegramUser.id)
		.single();

	return user?.id ?? null;
}
