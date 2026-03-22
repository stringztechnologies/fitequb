import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initSentry } from "./lib/sentry.js";
import { telegramAuth } from "./middleware/telegram-auth.js";
import { admin } from "./routes/admin.js";
import { auth } from "./routes/auth.js";
import { challenges } from "./routes/challenges.js";
import { cron } from "./routes/cron.js";
import { equbRooms } from "./routes/equb-rooms.js";
import { gamification } from "./routes/gamification.js";
import { gyms } from "./routes/gyms.js";
import { health } from "./routes/health.js";
import { trainers } from "./routes/trainers.js";
import { webhooks } from "./routes/webhooks.js";
import { workouts } from "./routes/workouts.js";
import type { AppVariables } from "./types/context.js";

initSentry();

const app = new Hono<{ Variables: AppVariables }>();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.TELEGRAM_MINI_APP_URL ?? "https://fitequb.com",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Public routes (protected by their own auth)
app.route("/health", health);
app.route("/webhooks", webhooks);
app.route("/cron", cron);

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

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`FitEqub API running on http://localhost:${info.port}`);
});

export default app;
