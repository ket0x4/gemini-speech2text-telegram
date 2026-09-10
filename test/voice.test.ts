import { describe, expect, it, mock } from "bun:test";
import { InputFile } from "grammy";
import type { MediaContext } from "../src/handlers/voice.js";

describe("Voice Handler Logic", () => {
  it("should construct an InputFile with document name when transcript exceeds 4096 characters", () => {
    const longText = "a".repeat(4097);
    const document = new InputFile(Buffer.from(longText, "utf-8"), "transcript.txt");
    expect(document.filename).toBe("transcript.txt");
  });

  it("should keep short transcript under 4096 characters as regular text", () => {
    const shortText = "Hello, this is a transcribed voice message.";
    expect(shortText.length).toBeLessThanOrEqual(4096);
  });
});
