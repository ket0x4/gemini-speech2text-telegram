import { describe, expect, it } from "bun:test";
import { createTranscriptKeyboard, guessAudioMimeType, isAudioDocument } from "./voice.js";

describe("voice and audio document handlers", () => {
  it("guesses audio mime types correctly by extension", () => {
    expect(guessAudioMimeType("sample.mp3")).toBe("audio/mp3");
    expect(guessAudioMimeType("recording.m4a")).toBe("audio/m4a");
    expect(guessAudioMimeType("track.wav")).toBe("audio/wav");
    expect(guessAudioMimeType("voice.ogg")).toBe("audio/ogg");
    expect(guessAudioMimeType("audio.flac")).toBe("audio/flac");
    expect(guessAudioMimeType("note.opus")).toBe("audio/opus");
    expect(guessAudioMimeType("document.pdf")).toBeUndefined();
    expect(guessAudioMimeType(undefined)).toBeUndefined();
  });

  it("identifies audio documents accurately", () => {
    expect(isAudioDocument({ mime_type: "audio/ogg", file_name: "voice.ogg" })).toBe(true);
    expect(isAudioDocument({ mime_type: "audio/mpeg", file_name: "song.mp3" })).toBe(true);
    expect(
      isAudioDocument({ mime_type: "application/octet-stream", file_name: "recording.wav" }),
    ).toBe(true);
    expect(isAudioDocument({ mime_type: "application/octet-stream", file_name: "audio.m4a" })).toBe(
      true,
    );

    expect(isAudioDocument({ mime_type: "application/pdf", file_name: "document.pdf" })).toBe(
      false,
    );
    expect(isAudioDocument({ mime_type: "application/zip", file_name: "archive.zip" })).toBe(false);
    expect(isAudioDocument(undefined)).toBe(false);
  });

  it("creates inline keyboard with Summarize and Action Items buttons", () => {
    const keyboard = createTranscriptKeyboard();
    const rows = keyboard.inline_keyboard;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(2);

    expect(rows[0][0].text).toContain("Summarize");
    expect("callback_data" in rows[0][0] && rows[0][0].callback_data).toBe("action:summary");

    expect(rows[0][1].text).toContain("Action Items");
    expect("callback_data" in rows[0][1] && rows[0][1].callback_data).toBe("action:actions");
  });
});
