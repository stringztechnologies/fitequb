import { Hono } from "hono";
import { rateLimit } from "../middleware/rate-limit.js";
import { supabase } from "../lib/supabase.js";
import type { AppVariables } from "../types/context.js";

const SYSTEM_PROMPT = `You are FitEqub Coach, a fitness advisor for young professionals in Addis Ababa, Ethiopia. Keep responses to 2-3 sentences. Be encouraging and motivational. Know about Orthodox fasting (Tsom) and Ethiopian food (injera, shiro, tibs). Suggest fasting-friendly exercises during Tsom periods. Reference local gyms and walking routes in Addis (Bole, Meskel Square, Entoto hills, Churchill Avenue). Speak casually like a friend, not a doctor. If the user asks non-fitness questions, gently redirect to fitness topics. Use ETB for money references. If the user mentions their Equb, encourage them to hit their step targets.`;

const ai = new Hono<{ Variables: AppVariables }>();

// 20 requests per minute
ai.use("/coach", rateLimit(20, 60 * 1000));

ai.post("/coach", async (c) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return c.json({ data: null, error: "AI coach not configured" }, 503);
  }

  const body = await c.req.json<{
    message: string;
    history?: Array<{ role: string; text: string }>;
  }>();
  if (!body.message?.trim()) {
    return c.json({ data: null, error: "Message is required" }, 400);
  }

  // Get user context for personalization
  const telegramUser = c.get("telegramUser");
  let userContext = "";
  try {
    const { data: user } = await supabase
      .from("users")
      .select("id, full_name, total_points, level")
      .eq("telegram_id", telegramUser.id)
      .single();

    if (user) {
      userContext = `\n\nUser context: Name is ${user.full_name}, level ${user.level}, ${user.total_points} points.`;

      const { data: activeRooms } = await supabase
        .from("equb_members")
        .select("equb_rooms(name, is_tsom)")
        .eq("user_id", user.id);

      if (activeRooms && activeRooms.length > 0) {
        const roomNames = (
          activeRooms as unknown as Array<{
            equb_rooms: { name: string; is_tsom: boolean } | null;
          }>
        )
          .map((r) =>
            r.equb_rooms
              ? `${r.equb_rooms.name}${r.equb_rooms.is_tsom ? " (Tsom mode)" : ""}`
              : null,
          )
          .filter(Boolean);
        if (roomNames.length > 0) {
          userContext += ` Active in Equbs: ${roomNames.join(", ")}.`;
        }
      }
    }
  } catch {
    // Continue without context if DB fails
  }

  // Build conversation history for multi-turn
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  if (body.history) {
    for (const msg of body.history.slice(-10)) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      });
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: body.message }],
  });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT + userContext }],
          },
          generationConfig: {
            maxOutputTokens: 256,
            temperature: 0.8,
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      return c.json(
        { data: null, error: "AI coach is temporarily unavailable" },
        502,
      );
    }

    const data = await res.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "I'm having trouble thinking right now. Try again!";

    return c.json({ data: { reply }, error: null });
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return c.json({ data: null, error: "Failed to reach AI coach" }, 502);
  }
});

export { ai };
