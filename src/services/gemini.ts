import { GoogleGenAI } from "@google/genai";
import { getConfig } from "../config.js";

let clientInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const config = getConfig();
  if (!clientInstance) {
    clientInstance = new GoogleGenAI({ apiKey: config.gemini_api_key });
  }
  return clientInstance;
}

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const config = getConfig();
  const client = getGeminiClient();

  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  const audioFile = await client.files.upload({
    file: blob,
    config: { mimeType },
  });

  try {
    const inputType = mimeType.startsWith("video/") ? "video" : "audio";
    const interaction = await client.interactions.create({
      model: config.model || "gemini-3.5-transcribe",
      input: [
        {
          type: inputType,
          uri: audioFile.uri,
          mime_type: audioFile.mimeType || mimeType,
        },
      ],
    });

    return (interaction.output_text ?? "").trim();
  } finally {
    if (audioFile.name) {
      try {
        await client.files.delete({ name: audioFile.name });
      } catch {
        // ignore file cleanup error
      }
    }
  }
}
