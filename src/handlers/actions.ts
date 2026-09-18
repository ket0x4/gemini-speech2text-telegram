import type { Context } from "grammy";
import { escapeHtml, generateActionItems, generateSummary } from "../services/gemini.js";

export async function handleActionCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  const message = ctx.callbackQuery?.message;

  if (!data || !message) {
    await ctx.answerCallbackQuery();
    return;
  }

  const textToProcess = message.text || message.caption;
  if (!textToProcess) {
    await ctx.answerCallbackQuery({
      text: "Unable to process: transcript text is not available in message.",
      show_alert: true,
    });
    return;
  }

  const isSummary = data === "action:summary";
  const isActions = data === "action:actions";

  if (!isSummary && !isActions) {
    await ctx.answerCallbackQuery();
    return;
  }

  await ctx.answerCallbackQuery({
    text: isSummary ? "Generating summary..." : "Extracting action items...",
  });

  await ctx.replyWithChatAction("typing").catch(() => {});

  try {
    if (isSummary) {
      const summary = await generateSummary(textToProcess);
      await ctx.reply(`📋 <b>Summary</b>\n\n${escapeHtml(summary)}`, {
        parse_mode: "HTML",
        reply_parameters: { message_id: message.message_id },
      });
    } else {
      const actionItems = await generateActionItems(textToProcess);
      await ctx.reply(`✅ <b>Action Items</b>\n\n${escapeHtml(actionItems)}`, {
        parse_mode: "HTML",
        reply_parameters: { message_id: message.message_id },
      });
    }
  } catch (error) {
    console.error(`[Actions] Error processing ${data}:`, error);
    await ctx.reply(
      `Failed to generate ${isSummary ? "summary" : "action items"}. Please try again later.`,
      {
        reply_parameters: { message_id: message.message_id },
      },
    );
  }
}
