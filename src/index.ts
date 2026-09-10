import { createBot } from "./bot.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

if (!config.bot_token) {
  console.error("Missing bot_token in config.json or TELEGRAM_BOT_TOKEN environment variable.");
  process.exit(1);
}

if (!config.gemini_api_key) {
  console.error("Missing gemini_api_key in config.json or GEMINI_API_KEY environment variable.");
  process.exit(1);
}

const bot = createBot(config);

const handleShutdown = async (signal: string) => {
  console.log(`Received ${signal}, stopping bot...`);
  await bot.stop();
  process.exit(0);
};

process.once("SIGINT", () => handleShutdown("SIGINT"));
process.once("SIGTERM", () => handleShutdown("SIGTERM"));

console.log(`Starting bot using Gemini model: ${config.model}`);
bot.start({
  onStart: (botInfo) => {
    console.log(`Bot running as @${botInfo.username}`);
  },
});
