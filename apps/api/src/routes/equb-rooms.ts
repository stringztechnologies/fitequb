import type { ApiResponse, EqubRoom } from "@fitequb/shared";
import {
  EQUB_DEFAULT_COMPLETION_PCT,
  EQUB_DEFAULT_DURATION_DAYS,
  EQUB_MAX_MEMBERS,
  EQUB_MAX_STAKE,
  EQUB_MIN_MEMBERS,
  EQUB_MIN_STAKE,
} from "@fitequb/shared";
import { Hono } from "hono";
import { z } from "zod";
import { rateLimit } from "../middleware/rate-limit.js";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const equbRooms = new Hono<{ Variables: AppVariables }>();

// 5 requests per minute on join (payment endpoint)
equbRooms.use("/:id/join", rateLimit(5, 60 * 1000));

const createRoomSchema = z.object({
  name: z.string().min(3).max(50),
  stake_amount: z.number().min(EQUB_MIN_STAKE).max(EQUB_MAX_STAKE),
  duration_days: z.number().min(7).max(90).default(EQUB_DEFAULT_DURATION_DAYS),
  workout_target: z.number().min(1),
  completion_pct: z
    .number()
    .min(0.5)
    .max(1.0)
    .default(EQUB_DEFAULT_COMPLETION_PCT),
  min_members: z
    .number()
    .min(EQUB_MIN_MEMBERS)
    .max(EQUB_MAX_MEMBERS)
    .default(EQUB_MIN_MEMBERS),
  max_members: z
    .number()
    .min(EQUB_MIN_MEMBERS)
    .max(EQUB_MAX_MEMBERS)
    .default(EQUB_MAX_MEMBERS),
  start_date: z.string().datetime(),
  sponsor_prize: z.number().min(0).default(0),
  room_type: z.enum(["public", "private", "sponsored"]).default("public"),
  is_tsom: z.boolean().default(false),
});

// POST /equb-rooms — create a new room
equbRooms.post("/", async (c) => {
  const telegramUser = c.get("telegramUser");
  const body = await c.req.json();
  const parsed = createRoomSchema.safeParse(body);

  if (!parsed.success) {
    return c.json<ApiResponse<null>>(
      {
        data: null,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      },
      400,
    );
  }

  // Look up internal user ID from telegram_id
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramUser.id)
    .single();

  if (!user) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "User not found" },
      404,
    );
  }

  const { data: room, error } = await supabase
    .from("equb_rooms")
    .insert({
      ...parsed.data,
      creator_id: user.id,
      status: "pending",
      end_date: new Date(
        new Date(parsed.data.start_date).getTime() +
          parsed.data.duration_days * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .select()
    .single();

  if (error) {
    return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
  }

  return c.json<ApiResponse<EqubRoom>>(
    { data: room as EqubRoom, error: null },
    201,
  );
});

// GET /equb-rooms — list rooms
equbRooms.get("/", async (c) => {
  const status = c.req.query("status");

  let query = supabase
    .from("equb_rooms")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return c.json<ApiResponse<null>>({ data: null, error: error.message }, 500);
  }

  return c.json<ApiResponse<EqubRoom[]>>({
    data: data as EqubRoom[],
    error: null,
  });
});

// GET /equb-rooms/:id — room detail with members
equbRooms.get("/:id", async (c) => {
  const roomId = c.req.param("id");

  const [roomResult, membersResult] = await Promise.all([
    supabase.from("equb_rooms").select("*").eq("id", roomId).single(),
    supabase
      .from("equb_members")
      .select("*, users(full_name, username)")
      .eq("room_id", roomId),
  ]);

  if (roomResult.error) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Room not found" },
      404,
    );
  }

  return c.json({
    data: {
      room: roomResult.data,
      members: membersResult.data ?? [],
    },
    error: null,
  });
});

// POST /equb-rooms/:id/join — join a room
equbRooms.post("/:id/join", async (c) => {
  const roomId = c.req.param("id");
  const telegramUser = c.get("telegramUser");

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramUser.id)
    .single();

  if (!user) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "User not found" },
      404,
    );
  }

  // Get room and validate
  const { data: room } = await supabase
    .from("equb_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (!room) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Room not found" },
      404,
    );
  }

  if (room.status !== "pending") {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Room is no longer accepting members" },
      400,
    );
  }

  // Check capacity
  const { count } = await supabase
    .from("equb_members")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (count !== null && count >= room.max_members) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Room is full" },
      400,
    );
  }

  // Check not already joined
  const { data: existing } = await supabase
    .from("equb_members")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Already joined this room" },
      400,
    );
  }

  // If free Equb (stake = 0), join directly
  if (room.stake_amount === 0) {
    const { data: member, error } = await supabase
      .from("equb_members")
      .insert({ room_id: roomId, user_id: user.id, completed_days: 0 })
      .select()
      .single();

    if (error) {
      return c.json<ApiResponse<null>>(
        { data: null, error: error.message },
        500,
      );
    }

    return c.json({ data: { member, checkout_url: null }, error: null }, 201);
  }

  // For paid Equbs — initialize Chapa payment
  const { initializePayment } = await import("../lib/chapa.js");
  const txRef = `equb-${roomId}-${user.id}-${Date.now()}`;

  const chapaRes = await initializePayment({
    amount: room.stake_amount,
    currency: "ETB",
    tx_ref: txRef,
    callback_url: `${process.env.API_URL}/webhooks/chapa`,
    return_url: `${process.env.TELEGRAM_MINI_APP_URL}/equbs/${roomId}`,
    first_name: telegramUser.first_name,
    last_name: telegramUser.last_name,
    phone_number: undefined,
  });

  if (chapaRes.status !== "success") {
    return c.json<ApiResponse<null>>(
      { data: null, error: "Payment initialization failed" },
      500,
    );
  }

  return c.json({
    data: {
      checkout_url: chapaRes.data.checkout_url,
      tx_ref: txRef,
    },
    error: null,
  });
});

// Settlement is handled exclusively via POST /cron/settle (requires CRON_SECRET).
// No public settlement endpoint — prevents unauthorized financial operations.

export { equbRooms };
