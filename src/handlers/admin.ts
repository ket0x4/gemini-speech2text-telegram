import type { Context } from "grammy";
import { getConfig, saveConfig } from "../config.js";

function isAuthorizedAdmin(ctx: Context): boolean {
  const userId = ctx.from?.id;
  if (!userId) {
    return false;
  }
  const config = getConfig();
  return config.admin_user_ids.includes(userId);
}

export async function handleAllow(ctx: Context): Promise<void> {
  if (!isAuthorizedAdmin(ctx)) {
    return;
  }

  const rawArg = typeof ctx.match === "string" ? ctx.match.trim() : "";
  let targetChatId: number;

  if (rawArg.length > 0) {
    targetChatId = Number.parseInt(rawArg, 10);
    if (Number.isNaN(targetChatId)) {
      await ctx.reply("Invalid chat ID provided.");
      return;
    }
  } else {
    if (!ctx.chat) {
      return;
    }
    targetChatId = ctx.chat.id;
  }

  const config = getConfig();
  if (config.allowed_chat_ids.includes(targetChatId)) {
    await ctx.reply(`Chat ${targetChatId} is already in the allowed list.`);
    return;
  }

  await saveConfig((cfg) => {
    cfg.allowed_chat_ids.push(targetChatId);
  });

  await ctx.reply(`Chat ${targetChatId} added to the allowed list.`);
}

export async function handleDisallow(ctx: Context): Promise<void> {
  if (!isAuthorizedAdmin(ctx)) {
    return;
  }

  const rawArg = typeof ctx.match === "string" ? ctx.match.trim() : "";
  let targetChatId: number;

  if (rawArg.length > 0) {
    targetChatId = Number.parseInt(rawArg, 10);
    if (Number.isNaN(targetChatId)) {
      await ctx.reply("Invalid chat ID provided.");
      return;
    }
  } else {
    if (!ctx.chat) {
      return;
    }
    targetChatId = ctx.chat.id;
  }

  const config = getConfig();
  if (!config.allowed_chat_ids.includes(targetChatId)) {
    await ctx.reply(`Chat ${targetChatId} is not in the allowed list.`);
    return;
  }

  await saveConfig((cfg) => {
    cfg.allowed_chat_ids = cfg.allowed_chat_ids.filter((id) => id !== targetChatId);
  });

  await ctx.reply(`Chat ${targetChatId} removed from the allowed list.`);
}

export async function handleChats(ctx: Context): Promise<void> {
  if (!isAuthorizedAdmin(ctx)) {
    return;
  }

  const config = getConfig();
  if (config.allowed_chat_ids.length === 0) {
    await ctx.reply("No chats currently allowed.");
    return;
  }

  const list = config.allowed_chat_ids.map((id) => `- ${id}`).join("\n");
  await ctx.reply(`Allowed chats:\n${list}`);
}
