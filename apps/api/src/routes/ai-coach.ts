import { Hono } from "hono";
import type { AppVariables } from "../types/context.js";

const aiCoach = new Hono<{ Variables: AppVariables }>();

interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

const SYSTEM_CONTEXT = `You are FitEqub Coach, a friendly and knowledgeable AI fitness coach powered by Gemini.
You help users in Addis Ababa stay accountable to their fitness goals through the FitEqub app.
You provide workout tips, nutrition advice (Ethiopian diet-friendly), motivation, and help users understand their Equb progress.
Keep responses concise, encouraging, and actionable. Use simple language.`;

/**
 * Mock responses for when GEMINI_API_KEY is not configured.
 * Provides a realistic AI coach experience with fitness advice.
 */
const MOCK_RESPONSES: Record<string, string[]> = {
	greeting: [
		"Hey there! I'm your FitEqub AI Coach. I can help with workout plans, nutrition tips (including Ethiopian diet-friendly options), and keeping you motivated. What would you like to work on today?",
		"Welcome to FitEqub Coach! Whether you need a quick workout, meal ideas with injera-friendly macros, or help hitting your Equb targets — I'm here for you. What's on your mind?",
	],
	workout: [
		"Here's a quick 20-minute bodyweight circuit you can do anywhere:\n\n1. **Jumping Jacks** — 45 sec\n2. **Push-ups** — 12 reps\n3. **Bodyweight Squats** — 15 reps\n4. **Plank** — 30 sec\n5. **Lunges** — 10 each leg\n6. **Burpees** — 8 reps\n\nRepeat 3 rounds with 60 sec rest between rounds. This counts as your daily Equb workout!",
		"For a solid gym session today, try this split:\n\n**Upper Body Focus (45 min)**\n- Bench Press: 4x8\n- Bent-Over Rows: 4x10\n- Overhead Press: 3x10\n- Lat Pulldowns: 3x12\n- Bicep Curls + Tricep Dips: 3x12 superset\n\nDon't forget to log it in your Equb room when you're done!",
	],
	nutrition: [
		"Great Ethiopian diet tips for fitness:\n\n- **Injera + Misir Wot** — great post-workout (lentils = protein + carbs from teff)\n- **Scrambled eggs (Enkulal Firfir)** — perfect breakfast, high protein\n- **Avocado juice** — healthy fats + potassium for recovery\n- **Kitfo** (lean) — excellent protein source\n\nAim for protein at every meal. A good target is 1.6g per kg of bodyweight.",
		"Here's a sample meal plan:\n\n**Breakfast:** Enkulal Firfir (egg scramble) + avocado\n**Snack:** Banana + handful of roasted peanuts\n**Lunch:** Injera with Doro Wot (chicken) + gomen (collard greens)\n**Post-workout:** Protein smoothie or spris (layered juice)\n**Dinner:** Tibs (lean beef/chicken) with salad\n\nStay hydrated — aim for 2-3 liters of water daily!",
	],
	motivation: [
		"Remember why you started! Your Equb group is counting on you, and every workout you log gets you closer to that payout. You've already shown commitment by joining — now keep that streak going!\n\n**Quick tip:** Set your workout clothes out the night before. Removing friction makes consistency easier.",
		"You're doing amazing! Consistency beats intensity every time. Even a 15-minute walk counts as movement.\n\nThink about it — if you complete your Equb target, you're not just winning ETB. You're building a habit that changes your life. Your future self will thank you!",
	],
	steps: [
		"To boost your daily steps:\n\n1. **Morning walk** — 15 min before work adds ~2,000 steps\n2. **Walk during calls** — easy 1,000+ steps\n3. **Take stairs** — skip the elevator\n4. **Evening stroll** — walk around your neighborhood after dinner\n5. **Walk to nearby errands** — skip the taxi for short trips\n\nAim for 8,000-10,000 steps daily for the challenge leaderboard!",
	],
	equb: [
		"Here's how to maximize your Equb success:\n\n1. **Log workouts daily** — don't let them stack up\n2. **Use QR check-in** at partner gyms for verified logs\n3. **Hit 80% completion** to qualify for the payout\n4. **Encourage your group** — accountability goes both ways\n\nThe pot splits among all qualifiers, so the more consistent you are, the better your chances!",
	],
	default: [
		"That's a great question! Here's my take:\n\nFor best results with FitEqub, focus on consistency over intensity. Log your workouts daily, stay active, and support your Equb group members.\n\nWant me to help with something specific? I can assist with:\n- Workout plans\n- Nutrition advice\n- Step challenge tips\n- Equb strategy\n- Motivation",
		"I appreciate you asking! While I'm focused on fitness coaching, here's what I can help with:\n\n- **Workout routines** — home or gym\n- **Nutrition tips** — Ethiopian diet-friendly\n- **Step challenges** — how to hit your targets\n- **Equb strategy** — maximizing your payout\n- **Motivation** — staying consistent\n\nWhat would you like to dive into?",
	],
};

function classifyMessage(message: string): string {
	const lower = message.toLowerCase();

	if (lower.match(/^(hi|hello|hey|selam|salam|start|begin|help)/) || lower.length < 10) {
		return "greeting";
	}
	if (lower.match(/workout|exercise|gym|train|push.?up|squat|run|lift|cardio|stretch|yoga|plank/)) {
		return "workout";
	}
	if (lower.match(/food|eat|diet|nutrition|meal|protein|injera|calor|macro|fasting/)) {
		return "nutrition";
	}
	if (lower.match(/motiv|tired|lazy|skip|quit|hard|give up|can't|stuck|bored|don't feel/)) {
		return "motivation";
	}
	if (lower.match(/step|walk|10.?000|pedometer|challenge|leaderboard/)) {
		return "steps";
	}
	if (lower.match(/equb|stake|payout|pot|split|qualify|room|group|account/)) {
		return "equb";
	}
	return "default";
}

function getMockResponse(message: string): string {
	const category = classifyMessage(message);
	const responses = MOCK_RESPONSES[category] ?? MOCK_RESPONSES.default ?? [];
	const index = Math.floor(Math.random() * responses.length);
	return responses[index] ?? "I'm here to help with your fitness journey! What would you like to know?";
}

async function getGeminiResponse(messages: ChatMessage[], _userMessage: string): Promise<string> {
	const apiKey = process.env.GEMINI_API_KEY;

	if (!apiKey) {
		// Fall back to mock responses when no API key is configured
		return getMockResponse(_userMessage);
	}

	try {
		const contents = messages.map((msg) => ({
			role: msg.role === "assistant" ? "model" : "user",
			parts: [{ text: msg.content }],
		}));

		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					contents,
					systemInstruction: { parts: [{ text: SYSTEM_CONTEXT }] },
					generationConfig: {
						temperature: 0.7,
						topP: 0.9,
						maxOutputTokens: 512,
					},
				}),
			},
		);

		if (!response.ok) {
			console.error("Gemini API error:", response.status);
			return getMockResponse(_userMessage);
		}

		const data = (await response.json()) as {
			candidates?: Array<{
				content?: { parts?: Array<{ text?: string }> };
			}>;
		};

		const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
		if (!text) {
			return getMockResponse(_userMessage);
		}

		return text;
	} catch (error) {
		console.error("Gemini API call failed:", error);
		return getMockResponse(_userMessage);
	}
}

// POST /api/ai-coach/chat
aiCoach.post("/chat", async (c) => {
	try {
		const body = await c.req.json<{
			message: string;
			history?: ChatMessage[];
		}>();

		if (!body.message || typeof body.message !== "string") {
			return c.json({ data: null, error: "Message is required" }, 400);
		}

		if (body.message.length > 1000) {
			return c.json({ data: null, error: "Message too long (max 1000 chars)" }, 400);
		}

		const history = body.history ?? [];
		const allMessages: ChatMessage[] = [
			...history.slice(-10), // Keep last 10 messages for context
			{ role: "user", content: body.message },
		];

		const reply = await getGeminiResponse(allMessages, body.message);

		return c.json({
			data: { reply, source: process.env.GEMINI_API_KEY ? "gemini" : "mock" },
			error: null,
		});
	} catch {
		return c.json({ data: null, error: "Failed to get coach response" }, 500);
	}
});

// GET /api/ai-coach/suggestions
aiCoach.get("/suggestions", (c) => {
	const suggestions = [
		"Give me a quick workout",
		"What should I eat today?",
		"How do I win my Equb?",
		"I need motivation",
		"Help me hit 10K steps",
		"Best post-workout Ethiopian food?",
	];

	return c.json({ data: { suggestions }, error: null });
});

export { aiCoach };
