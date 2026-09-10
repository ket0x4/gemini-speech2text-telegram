import { describe, expect, it } from "bun:test";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig, saveConfig } from "../src/config.js";

describe("Configuration Manager", () => {
  const testConfigPath = resolve(process.cwd(), "test-config.json");

  it("should load configuration from JSON file", () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        bot_token: "test-token-123",
        gemini_api_key: "test-gemini-key",
        model: "gemini-3.5-transcribe",
        admin_user_ids: [111, 222],
        allowed_chat_ids: [333],
      }),
    );

    const config = loadConfig(testConfigPath);
    expect(config.bot_token).toBe("test-token-123");
    expect(config.gemini_api_key).toBe("test-gemini-key");
    expect(config.model).toBe("gemini-3.5-transcribe");
    expect(config.admin_user_ids).toEqual([111, 222]);
    expect(config.allowed_chat_ids).toEqual([333]);

    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  it("should save configuration updates atomically", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        bot_token: "test-token",
        gemini_api_key: "test-key",
        model: "gemini-3.5-transcribe",
        admin_user_ids: [100],
        allowed_chat_ids: [],
      }),
    );

    loadConfig(testConfigPath);

    await saveConfig((cfg) => {
      cfg.allowed_chat_ids.push(999);
    }, testConfigPath);

    const reloaded = loadConfig(testConfigPath);
    expect(reloaded.allowed_chat_ids).toContain(999);

    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });
});
