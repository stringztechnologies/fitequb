import type { ApiResponse, User } from "@fitequb/shared";
import { Hono } from "hono";
import { z } from "zod";
import { rateLimit } from "../middleware/rate-limit.js";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const loginSchema = z.object({
  trainer_code: z.string().max(20).optional(),
});

const auth = new Hono<{ Variables: AppVariables }>();

// 10 requests per minute
auth.use("/login", rateLimit(10, 60 * 1000));

auth.post("/login", async (c) => {
  const telegramUser = c.get("telegramUser");
  const body = await c.req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  const trainerCode = parsed.success ? parsed.data.trainer_code : undefined;

  const fullName = [telegramUser.first_name, telegramUser.last_name]
    .filter(Boolean)
    .join(" ");

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

  // If trainer code provided and user not already linked to a trainer
  if (trainerCode && !data.referred_by_trainer) {
    const { data: trainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("affiliate_code", trainerCode.toUpperCase())
      .eq("status", "active")
      .single();

    if (trainer) {
      await supabase
        .from("users")
        .update({ referred_by_trainer: trainer.id })
        .eq("id", data.id);
      data.referred_by_trainer = trainer.id;
    }
  }

  return c.json<ApiResponse<User>>({ data: data as User, error: null });
});

export { auth };
