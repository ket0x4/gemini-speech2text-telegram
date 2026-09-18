import { type Context, type Filter, InputFile } from "grammy";
import { getConfig } from "../config.js";
import { transcribeAudio } from "../services/gemini.js";
import { transcriptionQueue } from "../services/queue.js";
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

  console.log(
    `[Media] Received ${voice ? "voice message" : "video note"} from chat ${ctx.chat.id} (user ${ctx.from?.id})`,
  );

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

    if (result.isMultiSpeaker && result.htmlFormattedText) {
      if (result.htmlFormattedText.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
        try {
          await ctx.reply(result.htmlFormattedText, {
            parse_mode: "HTML",
            reply_parameters: { message_id: ctx.message.message_id },
          });
        } catch (htmlError) {
          console.warn(
            "[Media] HTML formatting reply failed, falling back to plain text:",
            htmlError,
          );
          await ctx.reply(result.text, {
            reply_parameters: { message_id: ctx.message.message_id },
          });
        }
      } else {
        const document = new InputFile(Buffer.from(result.text, "utf-8"), "transcript.txt");
        await ctx.replyWithDocument(document, {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      }
    } else {
      if (textToDeliver.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
        await ctx.reply(textToDeliver, {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      } else {
        const document = new InputFile(Buffer.from(textToDeliver, "utf-8"), "transcript.txt");
        await ctx.replyWithDocument(document, {
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
