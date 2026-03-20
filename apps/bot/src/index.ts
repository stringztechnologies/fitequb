import { Telegraf } from "telegraf";
import { startCommand } from "./commands/start.js";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
	throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

const bot = new Telegraf(token);

bot.start(startCommand);

bot.launch(() => {
	console.log("FitEqub Bot is running");
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
