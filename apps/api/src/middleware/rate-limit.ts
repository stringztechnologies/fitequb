import type { Context, Next } from "hono";

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of store) {
		if (now > entry.resetAt) store.delete(key);
	}
}, 5 * 60 * 1000);

export function rateLimit(maxRequests: number, windowMs: number) {
	return async (c: Context, next: Next) => {
		const telegramUser = c.get("telegramUser");
		const key = `${c.req.path}:${telegramUser?.id ?? c.req.header("x-forwarded-for") ?? "anon"}`;
		const now = Date.now();

		const entry = store.get(key);

		if (!entry || now > entry.resetAt) {
			store.set(key, { count: 1, resetAt: now + windowMs });
			await next();
			return;
		}

		if (entry.count >= maxRequests) {
			const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
			c.header("Retry-After", String(retryAfter));
			return c.json({ data: null, error: "Too many requests. Try again later." }, 429);
		}

		entry.count++;
		await next();
	};
}
