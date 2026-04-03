import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initSentry } from "./lib/sentry.js";
import { telegramAuth } from "./middleware/telegram-auth.js";
import { admin } from "./routes/admin.js";
import { ai } from "./routes/ai.js";
import { buddies } from "./routes/buddies.js";
import { coachPasses } from "./routes/coach-passes.js";
import { auth } from "./routes/auth.js";
import { challenges } from "./routes/challenges.js";
import { cron } from "./routes/cron.js";
import { duels } from "./routes/duels.js";
import { equbRooms } from "./routes/equb-rooms.js";
import { gamification } from "./routes/gamification.js";
import { gymPublic } from "./routes/gym-public.js";
import { gyms } from "./routes/gyms.js";
import { publicBrowse } from "./routes/public-browse.js";
import { health } from "./routes/health.js";
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
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Public routes (no Telegram auth required)
app.route("/health", health);
app.route("/webhooks", webhooks);
app.route("/cron", cron);
app.route("/gym", gymPublic);
app.route("/public", publicBrowse);
app.route("/web-auth", webAuth);

// Authenticated routes
app.use("/api/*", telegramAuth);
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

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`FitEqub API running on http://localhost:${info.port}`);
});

export default app;
