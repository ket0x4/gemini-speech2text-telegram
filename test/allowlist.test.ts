import { describe, expect, it } from "bun:test";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Context, NextFunction } from "grammy";
import { loadConfig } from "../src/config.js";
import { allowlistMiddleware } from "../src/middleware/allowlist.js";

describe("Allowlist Middleware", () => {
  const testConfigPath = resolve(process.cwd(), "test-allowlist-config.json");

  writeFileSync(
    testConfigPath,
    JSON.stringify({
      bot_token: "mock-token",
      gemini_api_key: "mock-key",
      model: "gemini-3.5-transcribe",
      admin_user_ids: [1000],
      allowed_chat_ids: [2000],
    }),
  );

  loadConfig(testConfigPath);

  it("should allow whitelisted chat", async () => {
    let nextCalled = false;
    const next: NextFunction = async () => {
      nextCalled = true;
    };

    const ctx = {
      chat: { id: 2000 },
      from: { id: 555 },
    } as unknown as Context;

    await allowlistMiddleware(ctx, next);
    expect(nextCalled).toBe(true);
  });

  it("should allow admin regardless of chat ID", async () => {
    let nextCalled = false;
    const next: NextFunction = async () => {
      nextCalled = true;
    };

    const ctx = {
      chat: { id: 999999 },
      from: { id: 1000 },
    } as unknown as Context;

    await allowlistMiddleware(ctx, next);
    expect(nextCalled).toBe(true);
  });

  it("should silently drop non-whitelisted chat and non-admin user", async () => {
    let nextCalled = false;
    const next: NextFunction = async () => {
      nextCalled = true;
    };

    const ctx = {
      chat: { id: 999999 },
      from: { id: 555 },
    } as unknown as Context;

    await allowlistMiddleware(ctx, next);
    expect(nextCalled).toBe(false);
  });

  if (existsSync(testConfigPath)) {
    unlinkSync(testConfigPath);
  }
});
