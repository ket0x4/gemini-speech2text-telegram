import { describe, expect, it } from "bun:test";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Context } from "grammy";
import { getConfig, loadConfig } from "../src/config.js";
import { handleAllow, handleChats, handleDisallow } from "../src/handlers/admin.js";

describe("Admin Handlers", () => {
  const testConfigPath = resolve(process.cwd(), "test-admin-config.json");

  writeFileSync(
    testConfigPath,
    JSON.stringify({
      bot_token: "mock-token",
      gemini_api_key: "mock-key",
      model: "gemini-3.5-transcribe",
      admin_user_ids: [100],
      allowed_chat_ids: [],
    }),
  );

  loadConfig(testConfigPath);

  it("should ignore /allow when called by non-admin", async () => {
    let replied = false;
    const ctx = {
      from: { id: 999 },
      chat: { id: 123 },
      match: "",
      reply: async () => {
        replied = true;
      },
    } as unknown as Context;

    await handleAllow(ctx);
    expect(replied).toBe(false);
    expect(getConfig().allowed_chat_ids).not.toContain(123);
  });

  it("should add current chat when /allow called by admin without arguments", async () => {
    let replyText = "";
    const ctx = {
      from: { id: 100 },
      chat: { id: 456 },
      match: "",
      reply: async (text: string) => {
        replyText = text;
      },
    } as unknown as Context;

    await handleAllow(ctx);
    expect(replyText).toContain("456 added to the allowed list");
    expect(getConfig().allowed_chat_ids).toContain(456);
  });

  it("should add specific chat ID when /allow <id> called by admin", async () => {
    let replyText = "";
    const ctx = {
      from: { id: 100 },
      chat: { id: 456 },
      match: "789",
      reply: async (text: string) => {
        replyText = text;
      },
    } as unknown as Context;

    await handleAllow(ctx);
    expect(replyText).toContain("789 added to the allowed list");
    expect(getConfig().allowed_chat_ids).toContain(789);
  });

  it("should list chats with /chats", async () => {
    let replyText = "";
    const ctx = {
      from: { id: 100 },
      reply: async (text: string) => {
        replyText = text;
      },
    } as unknown as Context;

    await handleChats(ctx);
    expect(replyText).toContain("456");
    expect(replyText).toContain("789");
  });

  it("should remove chat ID with /disallow", async () => {
    let replyText = "";
    const ctx = {
      from: { id: 100 },
      chat: { id: 456 },
      match: "456",
      reply: async (text: string) => {
        replyText = text;
      },
    } as unknown as Context;

    await handleDisallow(ctx);
    expect(replyText).toContain("456 removed from the allowed list");
    expect(getConfig().allowed_chat_ids).not.toContain(456);
  });

  if (existsSync(testConfigPath)) {
    unlinkSync(testConfigPath);
  }
});
