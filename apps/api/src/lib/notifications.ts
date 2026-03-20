import { getLevelForPoints } from "@fitequb/shared";
import { supabase } from "./supabase.js";

export async function checkAndNotifyLevelUp(userId: string, previousPoints: number): Promise<void> {
	const { data: user } = await supabase
		.from("users")
		.select("total_points, level, telegram_id, full_name")
		.eq("id", userId)
		.single();

	if (!user) return;

	const oldLevel = getLevelForPoints(previousPoints);
	const newLevel = getLevelForPoints(user.total_points);

	if (newLevel.level <= oldLevel.level) return;

	const botToken = process.env.TELEGRAM_BOT_TOKEN;
	if (!botToken) return;

	const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL ?? "";

	let message = `🎉 Level Up! ${user.full_name}, you reached Level ${newLevel.level} — ${newLevel.name}!`;
	if (newLevel.perk) {
		message += `\n\n🎁 New perk unlocked: ${newLevel.perk}`;
	}

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
							text: "View Profile",
							web_app: { url: `${miniAppUrl}/profile` },
						},
					],
				],
			},
		}),
	});
}
