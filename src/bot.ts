import { Bot } from "grammy";
import { handleAllow, handleChats, handleDisallow } from "./handlers/admin.js";
import { handleSetLang } from "./handlers/language.js";
import { handleVoiceMessage } from "./handlers/voice.js";
import { allowlistMiddleware } from "./middleware/allowlist.js";
import type { BotConfig } from "./types.js";

export function createBot(config: BotConfig): Bot {
  const bot = new Bot(config.bot_token);

  bot.catch((err) => {
    console.error("Unhandled bot error:", err.error);
  });

  bot.use(allowlistMiddleware);

  bot.command("allow", handleAllow);
  bot.command("disallow", handleDisallow);
  bot.command("chats", handleChats);
  bot.command("setlang", handleSetLang);

  bot.on(["message:voice", "message:video_note"], handleVoiceMessage);

  return bot;
}
