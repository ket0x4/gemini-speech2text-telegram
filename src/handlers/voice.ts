import { type Context, type Filter, InlineKeyboard, InputFile } from "grammy";
import { getConfig } from "../config.js";
import { transcribeAudio } from "../services/gemini.js";
import { transcriptionQueue } from "../services/queue.js";
import { downloadTelegramFile } from "../services/telegram.js";

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

type MediaContext = Filter<
  Context,
  "message:voice" | "message:video_note" | "message:audio" | "message:document"
>;

export function guessAudioMimeType(fileName?: string): string | undefined {
  if (!fileName) return undefined;
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp3":
      return "audio/mp3";
    case "m4a":
      return "audio/m4a";
    case "wav":
      return "audio/wav";
    case "ogg":
    case "oga":
      return "audio/ogg";
    case "opus":
      return "audio/opus";
    case "aac":
      return "audio/aac";
    case "flac":
      return "audio/flac";
    case "weba":
      return "audio/webm";
    default:
      return undefined;
  }
}

export function isAudioDocument(document?: { mime_type?: string; file_name?: string }): boolean {
  if (!document) return false;
  if (document.mime_type?.startsWith("audio/")) return true;
  return Boolean(guessAudioMimeType(document.file_name));
}

export function createTranscriptKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📋 Summarize", "action:summary")
    .text("✅ Action Items", "action:actions");
}

export async function handleVoiceMessage(ctx: MediaContext): Promise<void> {
  const voice = ctx.message.voice;
  const videoNote = ctx.message.video_note;
  const audio = ctx.message.audio;
  const document = ctx.message.document;

  let fileId: string | undefined;
  let mimeType = "audio/ogg";
  let mediaLabel = "voice message";

  if (voice) {
    fileId = voice.file_id;
    mimeType = voice.mime_type ?? "audio/ogg";
    mediaLabel = "voice message";
  } else if (videoNote) {
    fileId = videoNote.file_id;
    mimeType = "video/mp4";
    mediaLabel = "video note";
  } else if (audio) {
    fileId = audio.file_id;
    mimeType = audio.mime_type ?? "audio/mpeg";
    mediaLabel = "audio file";
  } else if (document) {
    if (!isAudioDocument(document)) {
      return;
    }
    fileId = document.file_id;
    mimeType =
      document.mime_type && document.mime_type !== "application/octet-stream"
        ? document.mime_type
        : (guessAudioMimeType(document.file_name) ?? "audio/mpeg");
    mediaLabel = "audio document";
  }

  if (!fileId) {
    return;
  }

  console.log(`[Media] Received ${mediaLabel} from chat ${ctx.chat.id} (user ${ctx.from?.id})`);

  await ctx.replyWithChatAction("typing");

  const typingInterval = setInterval(() => {
    ctx.replyWithChatAction("typing").catch(() => {});
  }, 4000);

  try {
    const config = getConfig();
    const file = await ctx.api.getFile(fileId);

    if (!file.file_path) {
      throw new Error("Telegram did not return a file path.");
    }

    const chatIdStr = ctx.chat.id.toString();
    const chatLangCodes = config.chat_languages?.[chatIdStr];
    const languageCodes =
      chatLangCodes !== undefined ? chatLangCodes : (config.default_language_codes ?? []);

    const buffer = await downloadTelegramFile(config.bot_token, file.file_path);
    const result = await transcriptionQueue.enqueue(() =>
      transcribeAudio(buffer, mimeType, languageCodes),
    );
    const textToDeliver = result.text;

    console.log(
      `[Media] Completed transcription for chat ${ctx.chat.id} (${textToDeliver.length} chars, multiSpeaker: ${result.isMultiSpeaker})`,
    );

    if (!textToDeliver) {
      await ctx.reply("No speech detected.", {
        reply_parameters: { message_id: ctx.message.message_id },
      });
      return;
    }

    const replyMarkup = createTranscriptKeyboard();

    if (result.isMultiSpeaker && result.htmlFormattedText) {
      if (result.htmlFormattedText.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
        try {
          await ctx.reply(result.htmlFormattedText, {
            parse_mode: "HTML",
            reply_parameters: { message_id: ctx.message.message_id },
            reply_markup: replyMarkup,
          });
        } catch (htmlError) {
          console.warn(
            "[Media] HTML formatting reply failed, falling back to plain text:",
            htmlError,
          );
          await ctx.reply(result.text, {
            reply_parameters: { message_id: ctx.message.message_id },
            reply_markup: replyMarkup,
          });
        }
      } else {
        const documentFile = new InputFile(Buffer.from(result.text, "utf-8"), "transcript.txt");
        await ctx.replyWithDocument(documentFile, {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      }
    } else {
      if (textToDeliver.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
        await ctx.reply(textToDeliver, {
          reply_parameters: { message_id: ctx.message.message_id },
          reply_markup: replyMarkup,
        });
      } else {
        const documentFile = new InputFile(Buffer.from(textToDeliver, "utf-8"), "transcript.txt");
        await ctx.replyWithDocument(documentFile, {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      }
    }
  } catch (error) {
    console.error("Transcription error:", error);
    await ctx.reply("Failed to transcribe audio.", {
      reply_parameters: { message_id: ctx.message.message_id },
    });
  } finally {
    clearInterval(typingInterval);
  }
}
