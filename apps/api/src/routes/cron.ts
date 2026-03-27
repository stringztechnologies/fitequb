import { timingSafeEqual } from "node:crypto";
import { POINTS_EQUB_COMPLETE, POINTS_EQUB_WIN } from "@fitequb/shared";
import { Hono } from "hono";
import { notifySettlementResult } from "../lib/bot-notify.js";
import { initiateTransfer } from "../lib/chapa.js";
import { supabase } from "../lib/supabase.js";

const cron = new Hono();

// Verify cron secret to prevent unauthorized access (timing-safe)
function verifyCronSecret(secret: string | undefined): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// POST /cron/settle — settle expired Equbs
cron.post("/settle", async (c) => {
  const secret = c.req.header("x-cron-secret");
  if (!verifyCronSecret(secret)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Find active rooms past their end_date
  const { data: expiredRooms, error: fetchError } = await supabase
    .from("equb_rooms")
    .select("id, name")
    .eq("status", "active")
    .lte("end_date", new Date().toISOString());

  if (fetchError) {
    return c.json({ error: fetchError.message }, 500);
  }

  if (!expiredRooms || expiredRooms.length === 0) {
    return c.json({ data: { settled: 0, rooms: [] }, error: null });
  }

  const results = [];

  for (const room of expiredRooms) {
    const { data, error } = await supabase.rpc("settle_equb", {
      room_id_input: room.id,
    });

    if (!error) {
      // Award points to qualified members
      const { data: members } = await supabase
        .from("equb_members")
        .select("user_id, qualified")
        .eq("room_id", room.id);

      for (const m of members ?? []) {
        if (m.qualified) {
          await supabase.rpc("award_points", {
            p_user_id: m.user_id,
            p_points: POINTS_EQUB_COMPLETE,
            p_reason: `Completed Equb: ${room.name}`,
            p_source_type: "equb_complete",
          });
        }
      }

      // Award win bonus to payout recipients
      const { data: payouts } = await supabase
        .from("equb_ledger")
        .select("user_id")
        .eq("room_id", room.id)
        .eq("type", "payout");

      for (const p of payouts ?? []) {
        await supabase.rpc("award_points", {
          p_user_id: p.user_id,
          p_points: POINTS_EQUB_WIN,
          p_reason: `Won Equb payout: ${room.name}`,
          p_source_type: "equb_win",
        });
      }

      // Process trainer commissions from house fee
      await supabase.rpc("process_trainer_commissions", {
        p_equb_id: room.id,
      });

      // Send Telegram notifications to all members about settlement results
      const { data: allMembers } = await supabase
        .from("equb_members")
        .select("user_id, qualified, payout_amount")
        .eq("room_id", room.id);

      for (const m of allMembers ?? []) {
        notifySettlementResult(
          m.user_id,
          room.name,
          room.id,
          m.qualified ?? false,
          m.payout_amount ?? 0,
        ).catch(() => {});
      }
    }

    results.push({
      room_id: room.id,
      name: room.name,
      success: !error,
      result: error ? error.message : data,
    });
  }

  return c.json({
    data: { settled: results.filter((r) => r.success).length, rooms: results },
    error: null,
  });
});

// POST /cron/reminders — send workout reminders
cron.post("/reminders", async (c) => {
  const secret = c.req.header("x-cron-secret");
  if (!verifyCronSecret(secret)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const today = new Date().toISOString().split("T")[0];

  // Get active rooms with members who haven't logged today
  const { data: activeRooms } = await supabase
    .from("equb_rooms")
    .select("id, name")
    .eq("status", "active");

  if (!activeRooms || activeRooms.length === 0) {
    return c.json({ data: { reminded: 0 }, error: null });
  }

  let reminded = 0;

  for (const room of activeRooms) {
    // Get members of this room with their telegram IDs
    const { data: members } = await supabase
      .from("equb_members")
      .select("user_id, users(telegram_id, full_name)")
      .eq("room_id", room.id);

    if (!members) continue;

    // Get users who already logged today
    const { data: todayWorkouts } = await supabase
      .from("workouts")
      .select("user_id")
      .eq("room_id", room.id)
      .gte("logged_at", `${today}T00:00:00Z`)
      .lt("logged_at", `${today}T23:59:59Z`);

    const loggedUserIds = new Set(todayWorkouts?.map((w) => w.user_id) ?? []);

    // Filter members who haven't logged
    const needsReminder = members.filter((m) => !loggedUserIds.has(m.user_id));

    for (const member of needsReminder) {
      const user = member.users as unknown as {
        telegram_id: number;
        full_name: string;
      } | null;
      if (!user?.telegram_id) continue;

      // Send Telegram notification via bot API
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) continue;

      const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL ?? "";
      const message = `🏋️ Hey ${user.full_name}! You haven't logged your workout for "${room.name}" today.\n\nDon't miss out — log now to stay on track!`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: user.telegram_id,
          text: message,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Log Workout",
                  web_app: { url: `${miniAppUrl}/equbs/${room.id}/log` },
                },
              ],
            ],
          },
        }),
      });

      reminded++;
    }
  }

  return c.json({ data: { reminded }, error: null });
});

// POST /cron/payouts — process payouts for settled Equbs
cron.post("/payouts", async (c) => {
  const secret = c.req.header("x-cron-secret");
  if (!verifyCronSecret(secret)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Find settled rooms with unpaid payout ledger entries
  const { data: pendingPayouts } = await supabase
    .from("equb_ledger")
    .select("id, room_id, user_id, amount, tx_ref, users(full_name, phone)")
    .eq("type", "payout")
    .is("paid_at", null);

  if (!pendingPayouts || pendingPayouts.length === 0) {
    return c.json({ data: { processed: 0, payouts: [] }, error: null });
  }

  const results = [];

  for (const payout of pendingPayouts) {
    const user = payout.users as unknown as {
      full_name: string;
      phone: string | null;
    } | null;

    if (!user?.phone) {
      results.push({
        payout_id: payout.id,
        success: false,
        error: "No phone number for payout",
      });
      continue;
    }

    const reference = `payout-${payout.room_id}-${payout.user_id}-${Date.now()}`;

    const transferResult = await initiateTransfer({
      account_name: user.full_name,
      account_number: user.phone,
      amount: payout.amount,
      currency: "ETB",
      reference,
      bank_code: "telebirr",
    });

    const success = transferResult?.status === "success";

    if (success) {
      // Mark payout as paid
      await supabase
        .from("equb_ledger")
        .update({ paid_at: new Date().toISOString() })
        .eq("id", payout.id);
    }

    results.push({
      payout_id: payout.id,
      amount: payout.amount,
      success,
      reference,
    });
  }

  return c.json({
    data: {
      processed: results.filter((r) => r.success).length,
      payouts: results,
    },
    error: null,
  });
});

// POST /cron/daily-reset — process daily verification results and reset
cron.post("/daily-reset", async (c) => {
  const secret = c.req.header("x-cron-secret");
  if (!verifyCronSecret(secret)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let updatedStreaks = 0;
  let completedDays = 0;
  let missedDays = 0;

  // Get all active equb members
  const { data: activeRooms } = await supabase
    .from("equb_rooms")
    .select("id")
    .eq("status", "active");

  if (activeRooms && activeRooms.length > 0) {
    const roomIds = activeRooms.map((r) => r.id);

    const { data: members } = await supabase
      .from("equb_members")
      .select("user_id, equb_room_id, completed_days")
      .in("equb_room_id", roomIds);

    if (members) {
      for (const member of members) {
        // Check if yesterday was complete
        const { data: summary } = await supabase
          .from("daily_verification_summary")
          .select("is_day_complete")
          .eq("user_id", member.user_id)
          .eq("date", yesterday)
          .single();

        if (summary?.is_day_complete) {
          // Increment completed_days
          await supabase
            .from("equb_members")
            .update({ completed_days: (member.completed_days ?? 0) + 1 })
            .eq("user_id", member.user_id)
            .eq("equb_room_id", member.equb_room_id);
          completedDays++;
        } else {
          missedDays++;
        }
      }
    }
  }

  // Update streak_days for ALL users
  const { data: allUsers } = await supabase
    .from("users")
    .select("id, streak_days");
  if (allUsers) {
    for (const user of allUsers) {
      const { data: summary } = await supabase
        .from("daily_verification_summary")
        .select("is_day_complete")
        .eq("user_id", user.id)
        .eq("date", yesterday)
        .single();

      if (summary?.is_day_complete) {
        await supabase
          .from("users")
          .update({ streak_days: (user.streak_days ?? 0) + 1 })
          .eq("id", user.id);
        updatedStreaks++;
      } else if ((user.streak_days ?? 0) > 0) {
        // Reset streak
        await supabase
          .from("users")
          .update({ streak_days: 0 })
          .eq("id", user.id);
      }
    }
  }

  // Clean up old verification data (> 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  await supabase
    .from("workout_verifications")
    .delete()
    .lt("verified_at", thirtyDaysAgo);
  await supabase
    .from("daily_verification_summary")
    .delete()
    .lt("date", thirtyDaysAgo.slice(0, 10));

  return c.json({
    data: {
      date: yesterday,
      completed_days: completedDays,
      missed_days: missedDays,
      streaks_updated: updatedStreaks,
    },
    error: null,
  });
});

export { cron };
