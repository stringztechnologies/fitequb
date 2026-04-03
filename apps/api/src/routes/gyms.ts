import { randomUUID } from "node:crypto";
import type { ApiResponse, DayPass, PartnerGym } from "@fitequb/shared";
import { DAY_PASS_EXPIRY_MINUTES } from "@fitequb/shared";
import { Hono } from "hono";
import { z } from "zod";
import { initializePayment } from "../lib/chapa.js";
import { resolveUserId } from "../lib/resolve-user.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { generateDailyQR } from "../lib/qr.js";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const dayPassSchema = z.object({
  gym_id: z.string().uuid(),
});

const gyms = new Hono<{ Variables: AppVariables }>();

// 5 requests per minute on day pass purchase
gyms.use("/day-passes", rateLimit(5, 60 * 1000));

// GET /gyms — list partner gyms
gyms.get("/", async (c) => {
  const { data, error } = await supabase
    .from("partner_gyms")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error) {
    return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
  }

  return c.json<ApiResponse<PartnerGym[]>>({
    data: data as PartnerGym[],
    error: null,
  });
});

// POST /day-passes — purchase a day pass
gyms.post("/day-passes", async (c) => {
  const telegramUser = c.get("telegramUser");
  const body = await c.req.json();
  const parsed = dayPassSchema.safeParse(body);
  if (!parsed.success) {
    return c.json<ApiResponse<null>>(
      {
        data: null,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      },
      400,
    );
  }
  const { gym_id } = parsed.data;

  const userId = await resolveUserId(c);
  if (!userId) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "User not found" },
      404,
    );
  }

  const { data: gym } = await supabase
    .from("partner_gyms")
    .select("*")
    .eq("id", gym_id)
    .eq("active", true)
    .single();

  if (!gym) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Gym not found" },
      404,
    );
  }

  const qrToken = randomUUID();
  const expiresAt = new Date(
    Date.now() + DAY_PASS_EXPIRY_MINUTES * 60 * 1000,
  ).toISOString();

  // Create pass in pending status (activated after payment)
  const { data: pass, error } = await supabase
    .from("day_passes")
    .insert({
      user_id: userId,
      gym_id,
      qr_token: qrToken,
      status: "pending",
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
  }

  const txRef = `daypass-${pass.id}-${Date.now()}`;

  const chapaRes = await initializePayment({
    amount: gym.app_day_pass,
    currency: "ETB",
    tx_ref: txRef,
    callback_url: `${process.env.API_URL}/webhooks/chapa`,
    return_url: `${process.env.TELEGRAM_MINI_APP_URL}/day-passes/${pass.id}`,
    first_name: telegramUser.first_name,
    last_name: telegramUser.last_name,
  });

  if (chapaRes.status !== "success") {
    // Clean up the pass
    await supabase.from("day_passes").delete().eq("id", pass.id);
    return c.json<ApiResponse<null>>(
      { data: null, error: "Payment initialization failed" },
      500,
    );
  }

  return c.json(
    {
      data: {
        pass: pass as DayPass,
        checkout_url: chapaRes.data.checkout_url,
      },
      error: null,
    },
    201,
  );
});

// GET /day-passes/:id — pass detail with QR
gyms.get("/day-passes/:id", async (c) => {
  const passId = c.req.param("id");

  const userId = await resolveUserId(c);
  if (!userId) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "User not found" },
      404,
    );
  }

  const { data: pass } = await supabase
    .from("day_passes")
    .select("*, partner_gyms(name, location)")
    .eq("id", passId)
    .eq("user_id", userId)
    .single();

  if (!pass) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Pass not found" },
      404,
    );
  }

  // Check expiry
  if (pass.status === "active" && new Date(pass.expires_at) < new Date()) {
    await supabase
      .from("day_passes")
      .update({ status: "expired" })
      .eq("id", passId);
    pass.status = "expired";
  }

  return c.json({ data: pass, error: null });
});

// POST /day-passes/:id/redeem — mark as redeemed
gyms.post("/day-passes/:id/redeem", async (c) => {
  const passId = c.req.param("id");

  const userId = await resolveUserId(c);
  if (!userId) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "User not found" },
      404,
    );
  }

  const { data: pass, error } = await supabase
    .from("day_passes")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("id", passId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select()
    .single();

  if (error || !pass) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Pass not found or already used" },
      400,
    );
  }

  return c.json<ApiResponse<DayPass>>({ data: pass as DayPass, error: null });
});

// GET /gyms/:id/qr — generate daily QR code (admin/gym owner only)
gyms.get("/:id/qr", async (c) => {
  const gymId = c.req.param("id");
  const telegramUser = c.get("telegramUser");

  // Admin check
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (adminId && String(telegramUser.id) !== adminId) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Admin access required" },
      403,
    );
  }

  const { data: gym } = await supabase
    .from("partner_gyms")
    .select("id, name")
    .eq("id", gymId)
    .eq("active", true)
    .single();

  if (!gym) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Gym not found" },
      404,
    );
  }

  const qrCode = generateDailyQR(gym.id);
  const today = new Date();
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
  );

  return c.json({
    data: {
      qr_code: qrCode,
      gym_name: gym.name,
      valid_until: endOfDay.toISOString(),
    },
    error: null,
  });
});

export { gyms };
