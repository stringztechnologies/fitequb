import { supabase } from "./supabase.js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL = process.env.TELEGRAM_MINI_APP_URL ?? "";

interface NotifyOptions {
  user_id: string;
  message: string;
  button_text?: string;
  button_url?: string;
}

/**
 * Sends a Telegram message to a user and logs it in the notifications table.
 * Looks up telegram_id from the user_id (Supabase UUID).
 */
export async function sendNotification(opts: NotifyOptions): Promise<boolean> {
  const { user_id, message, button_text, button_url } = opts;

  // Look up telegram_id
  const { data: user } = await supabase
    .from("users")
    .select("telegram_id, full_name")
    .eq("id", user_id)
    .single();

  if (!user?.telegram_id) return false;

  // Insert into notifications table (ignore errors if table doesn't exist)
  try {
    await supabase.from("notifications").insert({
      user_id,
      message,
      read: false,
    });
  } catch {
    // notifications table may not exist yet — don't block on this
  }

  // Send via Telegram Bot API
  if (!BOT_TOKEN) return false;

  const payload: Record<string, unknown> = {
    chat_id: user.telegram_id,
    text: message,
    parse_mode: "HTML",
  };

  if (button_text && button_url) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: button_text, web_app: { url: button_url } }]],
    };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Notify a user about their equb settlement result.
 */
export async function notifySettlementResult(
  userId: string,
  roomName: string,
  roomId: string,
  qualified: boolean,
  payoutAmount: number,
): Promise<void> {
  if (qualified && payoutAmount > 0) {
    await sendNotification({
      user_id: userId,
      message: `🏆 <b>You won!</b>\n\nYour Equb "<b>${roomName}</b>" has settled. You earned <b>${payoutAmount.toLocaleString()} ETB</b>!\n\nYour payout is being processed.`,
      button_text: "View Results",
      button_url: `${MINI_APP_URL}/win?room=${roomId}&payout=${payoutAmount}&name=${encodeURIComponent(roomName)}`,
    });
  } else if (qualified) {
    await sendNotification({
      user_id: userId,
      message: `✅ <b>Equb Complete!</b>\n\nYou qualified in "<b>${roomName}</b>". Great consistency!`,
      button_text: "View Details",
      button_url: `${MINI_APP_URL}/equbs/${roomId}`,
    });
  } else {
    await sendNotification({
      user_id: userId,
      message: `😔 <b>Equb Settled</b>\n\n"<b>${roomName}</b>" has ended. You didn't meet the workout target this time. Keep going — next round is yours!`,
      button_text: "Join New Equb",
      button_url: `${MINI_APP_URL}/equbs`,
    });
  }
}

/**
 * Notify a user about a buddy request.
 */
export async function notifyBuddyRequest(
  targetUserId: string,
  requesterName: string,
  equbName: string,
): Promise<void> {
  await sendNotification({
    user_id: targetUserId,
    message: `💪 <b>Buddy Request!</b>\n\n<b>${requesterName}</b> wants to be your workout buddy in "<b>${equbName}</b>".\n\nAccept to verify each other's workouts!`,
    button_text: "View Request",
    button_url: `${MINI_APP_URL}/profile`,
  });
}
