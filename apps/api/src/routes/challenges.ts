import type {
  ApiResponse,
  Challenge,
  ChallengeParticipant,
} from "@fitequb/shared";
import { Hono } from "hono";
import { z } from "zod";
import { resolveUserId } from "../lib/resolve-user.js";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const challenges = new Hono<{ Variables: AppVariables }>();

// GET /challenges — list active challenges
challenges.get("/", async (c) => {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .gte("end_date", new Date().toISOString())
    .order("start_date");

  if (error) {
    return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
  }

  return c.json<ApiResponse<Challenge[]>>({
    data: data as Challenge[],
    error: null,
  });
});

// POST /challenges/:id/join — join a challenge
challenges.post("/:id/join", async (c) => {
  const challengeId = c.req.param("id");

  const userId = await resolveUserId(c);
  if (!userId) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "User not found" },
      404,
    );
  }

  // Check not already joined
  const { data: existing } = await supabase
    .from("challenge_participants")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Already joined" },
      400,
    );
  }

  const { data: participant, error } = await supabase
    .from("challenge_participants")
    .insert({
      challenge_id: challengeId,
      user_id: userId,
      total_steps: 0,
    })
    .select()
    .single();

  if (error) {
    return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
  }

  return c.json<ApiResponse<ChallengeParticipant>>(
    { data: participant as ChallengeParticipant, error: null },
    201,
  );
});

const logStepsSchema = z.object({
  steps: z.number().min(0).max(100000),
});

// POST /challenges/:id/log-steps — daily step entry
challenges.post("/:id/log-steps", async (c) => {
  const challengeId = c.req.param("id");
  const body = await c.req.json();
  const parsed = logStepsSchema.safeParse(body);

  if (!parsed.success) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Invalid step count" },
      400,
    );
  }

  const userId = await resolveUserId(c);
  if (!userId) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "User not found" },
      404,
    );
  }

  const { data: participant, error } = await supabase
    .from("challenge_participants")
    .update({
      total_steps: parsed.data.steps,
      last_logged_at: new Date().toISOString(),
    })
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !participant) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Not a participant" },
      400,
    );
  }

  return c.json<ApiResponse<ChallengeParticipant>>({
    data: participant as ChallengeParticipant,
    error: null,
  });
});

// GET /challenges/:id/leaderboard — ranked participants
challenges.get("/:id/leaderboard", async (c) => {
  const challengeId = c.req.param("id");

  const { data, error } = await supabase
    .from("challenge_participants")
    .select("*, users(full_name, username)")
    .eq("challenge_id", challengeId)
    .order("total_steps", { ascending: false })
    .limit(50);

  if (error) {
    return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
  }

  return c.json({ data, error: null });
});

export { challenges };
