import { describe, expect, it } from "bun:test";
import {
  INLINE_AUDIO_SIZE_LIMIT,
  escapeHtml,
  extractWordAnnotations,
  formatDiarizedTranscript,
} from "./gemini.js";

describe("gemini service", () => {
  it("defines INLINE_AUDIO_SIZE_LIMIT as 20MB", () => {
    expect(INLINE_AUDIO_SIZE_LIMIT).toBe(20 * 1024 * 1024);
  });

  it("escapes HTML special characters correctly", () => {
    expect(escapeHtml("<hello> & 'world'")).toBe("&lt;hello&gt; &amp; 'world'");
  });

  it("extracts word annotations from interaction steps", () => {
    const mockInteraction = {
      steps: [
        {
          content: [
            {
              annotations: [
                { type: "word_info", text: "Hello", speaker: "spk_0" },
                { type: "word_info", text: "world", speaker: "spk_1" },
              ],
            },
          ],
        },
      ],
    };

    const words = extractWordAnnotations(mockInteraction);
    expect(words).toHaveLength(2);
    expect(words[0]).toEqual({ text: "Hello", speaker: "spk_0" });
    expect(words[1]).toEqual({ text: "world", speaker: "spk_1" });
  });

  it("extracts word annotations from candidates parts fallback", () => {
    const mockInteraction = {
      candidates: [
        {
          content: {
            parts: [
              {
                audioTranscription: {
                  words: [
                    { word: "Test", speaker: "spk_0" },
                    { word: "phrase", speaker: "spk_1" },
                  ],
                },
              },
            ],
          },
        },
      ],
    };

    const words = extractWordAnnotations(mockInteraction);
    expect(words).toHaveLength(2);
    expect(words[0]).toEqual({ text: "Test", speaker: "spk_0" });
    expect(words[1]).toEqual({ text: "phrase", speaker: "spk_1" });
  });

  it("formats diarized transcript for single speaker without extra tags", () => {
    const words = [
      { text: "Hello", speaker: "spk_0" },
      { text: "there", speaker: "spk_0" },
    ];
    const result = formatDiarizedTranscript(words, "Hello there");
    expect(result.isMultiSpeaker).toBe(false);
    expect(result.text).toBe("Hello there");
  });

  it("formats diarized transcript for multi speaker with labels and emojis", () => {
    const words = [
      { text: "Hi", speaker: "spk_0" },
      { text: "How", speaker: "spk_1" },
      { text: "are", speaker: "spk_1" },
      { text: "you?", speaker: "spk_1" },
      { text: "Good", speaker: "spk_0" },
    ];
    const result = formatDiarizedTranscript(words, "Hi How are you? Good");
    expect(result.isMultiSpeaker).toBe(true);
    expect(result.text).toContain("🟥 P1: Hi");
    expect(result.text).toContain("🟦 P2: How are you?");
    expect(result.text).toContain("🟥 P1: Good");
    expect(result.htmlFormattedText).toContain("🟥 <b>P1:</b> Hi");
  });
});
