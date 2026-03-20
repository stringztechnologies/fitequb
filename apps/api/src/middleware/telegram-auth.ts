import { createHmac } from "node:crypto";
import { createMiddleware } from "hono/factory";
import type { AppVariables, TelegramUser } from "../types/context.js";

/**
 * Validates Telegram Mini App initData using HMAC-SHA256.
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export const telegramAuth = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
	const authHeader = c.req.header("authorization");
	if (!authHeader?.startsWith("tma ")) {
		return c.json({ data: null, error: "Missing authorization header" }, 401);
	}

	const initData = authHeader.slice(4);
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

	await next();
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

	return computedHash === hash;
}
