import { createHmac, timingSafeEqual } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { supabase } from "../lib/supabase.js";
import type { AppVariables, TelegramUser } from "../types/context.js";

const QA_TEST_USER: TelegramUser = {
	id: 999999,
	first_name: "Test",
	last_name: "User",
	username: "qa_test_user",
};

/**
 * Dual auth middleware — accepts both Telegram and Supabase auth.
 *
 * Authorization header formats:
 *   - `tma {initData}` → Telegram Mini App auth
 *   - `Bearer {supabase_jwt}` → Supabase Auth (web users)
 */
export const telegramAuth = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
	const authHeader = c.req.header("authorization");

	if (!authHeader) {
		return c.json({ data: null, error: "Missing authorization header" }, 401);
	}

	// --- Supabase Bearer token auth ---
	if (authHeader.startsWith("Bearer ")) {
		const token = authHeader.slice(7);
		if (!token) {
			return c.json({ data: null, error: "Empty bearer token" }, 401);
		}

		// Verify the JWT and get the user
		const {
			data: { user: supabaseUser },
			error,
		} = await supabase.auth.getUser(token);

		if (error || !supabaseUser) {
			return c.json({ data: null, error: "Invalid or expired token" }, 401);
		}

		// Look up internal user by supabase_uid
		const { data: dbUser } = await supabase
			.from("users")
			.select("id")
			.eq("supabase_uid", supabaseUser.id)
			.single();

		if (!dbUser) {
			return c.json({ data: null, error: "User not found — complete sign-up first" }, 401);
		}

		// Set a synthetic TelegramUser for backward compatibility with existing routes
		const syntheticTgUser: TelegramUser = {
			id: 0,
			first_name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email ?? "User",
		};
		c.set("telegramUser", syntheticTgUser);
		c.set("authenticatedUser", {
			userId: dbUser.id,
			authMethod: "supabase",
			supabaseUid: supabaseUser.id,
		});

		await next();
		return;
	}

	// --- Telegram Mini App auth ---
	if (authHeader.startsWith("tma ")) {
		const initData = authHeader.slice(4);

		// QA test mode bypass — only in development
		if (process.env.NODE_ENV === "development" && (initData === "" || initData === "test")) {
			c.set("telegramUser", QA_TEST_USER);
			c.set("authenticatedUser", {
				userId: "qa-test-user",
				authMethod: "telegram",
				telegramUser: QA_TEST_USER,
			});
			await next();
			return;
		}

		const botToken = process.env.TELEGRAM_BOT_TOKEN;
		if (!botToken) {
			return c.json({ data: null, error: "Server misconfigured" }, 500);
		}

		if (!validateInitData(initData, botToken)) {
			return c.json({ data: null, error: "Invalid initData" }, 401);
		}

		const params = new URLSearchParams(initData);
		const userRaw = params.get("user");
		if (!userRaw) {
			return c.json({ data: null, error: "No user in initData" }, 401);
		}

		const telegramUser = JSON.parse(userRaw) as TelegramUser;
		c.set("telegramUser", telegramUser);

		// Look up internal user by telegram_id
		const { data: dbUser } = await supabase
			.from("users")
			.select("id")
			.eq("telegram_id", telegramUser.id)
			.single();

		c.set("authenticatedUser", {
			userId: dbUser?.id ?? "",
			authMethod: "telegram",
			telegramUser,
		});

		await next();
		return;
	}

	return c.json({ data: null, error: "Invalid authorization format" }, 401);
});

function validateInitData(initData: string, botToken: string): boolean {
	const params = new URLSearchParams(initData);
	const hash = params.get("hash");

	if (!hash) return false;

	params.delete("hash");
	const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
	const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

	const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
	const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

	const a = Buffer.from(computedHash, "hex");
	const b = Buffer.from(hash, "hex");
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
