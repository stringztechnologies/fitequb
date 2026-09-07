import type { Context } from "telegraf";

export async function startCommand(ctx: Context) {
	const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL;

	if (!miniAppUrl) {
		await ctx.reply("FitEqub is being set up. Check back soon!");
		return;
	}

	const command = ctx.message && "text" in ctx.message ? ctx.message.text : "";
	const match = /^\/start(?:@\w+)?\s+pilot_([a-f0-9-]{36})$/.exec(command);
	const destination = match
		? `${miniAppUrl.replace(/\/$/, "")}/pilot/${match[1]}?source=telegram`
		: miniAppUrl;

	await ctx.reply(
		"Welcome to FitEqub! 💪\n\n" +
			"Join fitness accountability groups, buy gym day passes, " +
			"and compete in step challenges.\n\n" +
			"Tap the button below to get started.",
		{
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "Open FitEqub",
							web_app: { url: destination },
						},
					],
				],
			},
		},
	);
}
