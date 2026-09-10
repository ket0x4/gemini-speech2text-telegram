import { type Context, type Filter, InputFile } from "grammy";
import { getConfig } from "../config.js";
import { transcribeAudio } from "../services/gemini.js";
import { downloadTelegramFile } from "../services/telegram.js";

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export type MediaContext = Filter<Context, "message:voice" | "message:video_note">;

export async function handleVoiceMessage(ctx: MediaContext): Promise<void> {
  const voice = ctx.message.voice;
  const videoNote = ctx.message.video_note;

  const fileId = voice?.file_id ?? videoNote?.file_id;
  if (!fileId) {
    return;
  }

  const mimeType = voice ? (voice.mime_type ?? "audio/ogg") : "video/mp4";

  await ctx.replyWithChatAction("typing");

  try {
    const config = getConfig();
    const file = await ctx.api.getFile(fileId);

    if (!file.file_path) {
      throw new Error("Telegram did not return a file path.");
    }

    const buffer = await downloadTelegramFile(config.bot_token, file.file_path);
    const transcript = await transcribeAudio(buffer, mimeType);

    if (!transcript) {
      await ctx.reply("No speech detected.", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    if (transcript.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
      await ctx.reply(transcript, {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    } else {
      const document = new InputFile(Buffer.from(transcript, "utf-8"), "transcript.txt");
      await ctx.replyWithDocument(document, {
        reply_parameters: { message_id: ctx.message.message_id },
      });
    }
  } catch (error) {
    console.error("Transcription error:", error);
    await ctx.reply("Failed to transcribe audio.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
  }
}
