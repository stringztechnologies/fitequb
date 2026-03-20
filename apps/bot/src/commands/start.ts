import type { Context } from "telegraf";

export async function startCommand(ctx: Context) {
	const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL;

	if (!miniAppUrl) {
		await ctx.reply("FitEqub is being set up. Check back soon!");
		return;
	}

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
							web_app: { url: miniAppUrl },
						},
					],
				],
			},
		},
	);
}
