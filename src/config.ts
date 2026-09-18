import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BotConfig } from "./types.js";

const DEFAULT_CONFIG_PATH = resolve(process.cwd(), "config.json");
const CONFIG_PATH = process.env.CONFIG_PATH || DEFAULT_CONFIG_PATH;

const DEFAULT_CONFIG: BotConfig = {
  bot_token: "",
  gemini_api_key: "",
  model: "gemini-3.5-transcribe",
  admin_user_ids: [],
  allowed_chat_ids: [],
  enable_diarization: false,
  default_language_codes: [],
  chat_languages: {},
};

let currentConfig: BotConfig | null = null;

export function loadConfig(configPath: string = CONFIG_PATH): BotConfig {
  let fileConfig: Partial<BotConfig> = {};

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      fileConfig = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Failed to parse config file at ${configPath}: ${error}`);
    }
  }

  const envBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const envGeminiApiKey = process.env.GEMINI_API_KEY;
  const envModel = process.env.GEMINI_MODEL;
  const envAdminIds = process.env.ADMIN_USER_IDS
    ? process.env.ADMIN_USER_IDS.split(",")
        .map((id) => Number.parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id))
    : undefined;
  const envEnableDiarization =
    process.env.ENABLE_DIARIZATION !== undefined
      ? process.env.ENABLE_DIARIZATION.toLowerCase() === "true" ||
        process.env.ENABLE_DIARIZATION === "1"
      : undefined;
  const envDefaultLanguageCodes = process.env.DEFAULT_LANGUAGE_CODES
    ? process.env.DEFAULT_LANGUAGE_CODES.split(",")
        .map((code) => code.trim())
        .filter((code) => code.length > 0)
    : undefined;

  const mergedConfig: BotConfig = {
    bot_token: envBotToken || fileConfig.bot_token || DEFAULT_CONFIG.bot_token,
    gemini_api_key: envGeminiApiKey || fileConfig.gemini_api_key || DEFAULT_CONFIG.gemini_api_key,
    model: envModel || fileConfig.model || DEFAULT_CONFIG.model,
    admin_user_ids:
      envAdminIds && envAdminIds.length > 0
        ? envAdminIds
        : Array.isArray(fileConfig.admin_user_ids)
          ? fileConfig.admin_user_ids
          : DEFAULT_CONFIG.admin_user_ids,
    allowed_chat_ids: Array.isArray(fileConfig.allowed_chat_ids)
      ? fileConfig.allowed_chat_ids
      : DEFAULT_CONFIG.allowed_chat_ids,
    enable_diarization:
      envEnableDiarization !== undefined
        ? envEnableDiarization
        : fileConfig.enable_diarization !== undefined
          ? fileConfig.enable_diarization
          : DEFAULT_CONFIG.enable_diarization,
    default_language_codes:
      envDefaultLanguageCodes !== undefined
        ? envDefaultLanguageCodes
        : Array.isArray(fileConfig.default_language_codes)
          ? fileConfig.default_language_codes
          : DEFAULT_CONFIG.default_language_codes,
    chat_languages:
      typeof fileConfig.chat_languages === "object" && fileConfig.chat_languages !== null
        ? fileConfig.chat_languages
        : DEFAULT_CONFIG.chat_languages,
  };

  currentConfig = mergedConfig;
  return mergedConfig;
}

export function getConfig(): BotConfig {
  if (!currentConfig) {
    return loadConfig();
  }
  return currentConfig;
}

export async function saveConfig(
  updater: (config: BotConfig) => void,
  configPath: string = CONFIG_PATH,
): Promise<BotConfig> {
  const config = getConfig();
  updater(config);

  const serialized = JSON.stringify(config, null, 2);
  const tempPath = `${configPath}.tmp`;

  try {
    writeFileSync(tempPath, serialized, "utf-8");
    renameSync(tempPath, configPath);
  } catch {
    writeFileSync(configPath, serialized, "utf-8");
    if (existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch {
        // ignore temp file cleanup error
      }
    }
  }

  currentConfig = config;
  return config;
}
