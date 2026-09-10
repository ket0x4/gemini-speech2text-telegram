import type { Context, NextFunction } from "grammy";
import { getConfig } from "../config.js";

export async function allowlistMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  const chat = ctx.chat;
  if (!chat) {
    return;
  }

  const config = getConfig();
  const userId = ctx.from?.id;
  const isAdmin = userId !== undefined && config.admin_user_ids.includes(userId);

  if (isAdmin) {
    await next();
    return;
  }

  if (config.allowed_chat_ids.includes(chat.id)) {
    await next();
    return;
  }

  console.log(
    `[Allowlist] Ignored update from unauthorized chat ID: ${chat.id} (type: ${chat.type}, user: ${userId})`,
  );
}
