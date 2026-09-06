import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { ZodError } from "zod";
import { initSentry } from "./lib/sentry.js";
import { telegramAuth } from "./middleware/telegram-auth.js";
import { admin } from "./routes/admin.js";
import { ai } from "./routes/ai.js";
import { auth } from "./routes/auth.js";
import { buddies } from "./routes/buddies.js";
import { challenges } from "./routes/challenges.js";
import { coachPasses } from "./routes/coach-passes.js";
import { cron } from "./routes/cron.js";
import { duels } from "./routes/duels.js";
import { equbRooms } from "./routes/equb-rooms.js";
import { gamification } from "./routes/gamification.js";
import { gymPublic } from "./routes/gym-public.js";
import { gyms } from "./routes/gyms.js";
import { health } from "./routes/health.js";
import { pilotAdmin } from "./routes/pilot-admin.js";
import { pilots, publicPilots } from "./routes/pilots.js";
import { publicBrowse } from "./routes/public-browse.js";
import { trainers } from "./routes/trainers.js";
import { verify } from "./routes/verify.js";
import { webAuth } from "./routes/web-auth.js";
import { webhooks } from "./routes/webhooks.js";
import { workouts } from "./routes/workouts.js";
import type { AppVariables } from "./types/context.js";

initSentry();

const app = new Hono<{ Variables: AppVariables }>();

// Global middleware
app.use("*", bodyLimit({ maxSize: 5 * 1024 * 1024 })); // 5MB
app.use("*", logger());
app.use(
	"*",
	cors({
		origin: [
			process.env.TELEGRAM_MINI_APP_URL ?? "https://fitequb.com",
			"https://fitequb.com",
			"https://www.fitequb.com",
		],
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
		allowHeaders: ["Content-Type", "Authorization"],
	}),
);

// Public routes (no Telegram auth required)
app.route("/health", health);
app.route("/webhooks", webhooks);
app.route("/cron", cron);
app.route("/gym", gymPublic);
app.route("/public/pilots", publicPilots);
app.route("/public", publicBrowse);
app.route("/web-auth", webAuth);

// Authenticated routes
app.use("/api/*", telegramAuth);
app.route("/api/pilots", pilots);
app.route("/api/pilot-admin", pilotAdmin);
app.route("/api/auth", auth);
app.route("/api/equb-rooms", equbRooms);
app.route("/api/workouts", workouts);
app.route("/api/gyms", gyms);
app.route("/api/challenges", challenges);
app.route("/api/gamification", gamification);
app.route("/api/trainers", trainers);
app.route("/api/admin", admin);
app.route("/api/ai", ai);
app.route("/api/buddies", buddies);
app.route("/api/coach-passes", coachPasses);
app.route("/api/duels", duels);
app.route("/api/verify", verify);

app.onError((error, c) => {
	if (error instanceof HTTPException)
		return c.json({ data: null, error: error.message }, error.status);
	if (error instanceof ZodError)
		return c.json({ data: null, error: error.issues.map((i) => i.message).join(", ") }, 400);
	if (c.req.path.includes("pilot")) return c.json({ data: null, error: error.message }, 400);
	return c.json({ data: null, error: "Request failed" }, 500);
});
export default app;
