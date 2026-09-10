export interface BotConfig {
  bot_token: string;
  gemini_api_key: string;
  model: string;
  admin_user_ids: number[];
  allowed_chat_ids: number[];
}

export interface AudioFileData {
  buffer: Buffer;
  mimeType: string;
}
