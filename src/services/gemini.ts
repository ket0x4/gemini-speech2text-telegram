import { GoogleGenAI } from "@google/genai";
import { getConfig } from "../config.js";
import type { TranscriptionResult } from "../types.js";

export const SPEAKER_EMOJIS = ["🟥", "🟦", "🟩", "🟨", "🟪", "🟧"];

let clientInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const config = getConfig();
  if (!clientInstance) {
    clientInstance = new GoogleGenAI({ apiKey: config.gemini_api_key });
  }
  return clientInstance;
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface WordAnnotation {
  text?: string;
  speaker?: string;
}

interface InteractionStepAnnotation {
  type?: string;
  speaker?: string;
  text?: string;
  word?: string;
}

interface InteractionStepContent {
  annotations?: InteractionStepAnnotation[];
}

interface InteractionStep {
  content?: InteractionStepContent[];
}

interface InteractionCandidatePart {
  audioTranscription?: {
    speakerLabel?: string;
    words?: Array<{ word?: string; text?: string; speaker?: string }>;
  };
}

interface InteractionCandidate {
  content?: {
    parts?: InteractionCandidatePart[];
  };
}

export interface InteractionLike {
  steps?: InteractionStep[];
  candidates?: InteractionCandidate[];
}

export function extractWordAnnotations(interaction: unknown): WordAnnotation[] {
  const words: WordAnnotation[] = [];
  if (!interaction || typeof interaction !== "object") {
    return words;
  }

  const obj = interaction as Record<string, unknown>;

  if (Array.isArray(obj.steps)) {
    for (const step of obj.steps) {
      if (!step || typeof step !== "object") continue;
      const stepObj = step as Record<string, unknown>;
      if (Array.isArray(stepObj.content)) {
        for (const content of stepObj.content) {
          if (!content || typeof content !== "object") continue;
          const contentObj = content as Record<string, unknown>;
          if (Array.isArray(contentObj.annotations)) {
            for (const annotation of contentObj.annotations) {
              if (!annotation || typeof annotation !== "object") continue;
              const annObj = annotation as Record<string, unknown>;
              const speaker = typeof annObj.speaker === "string" ? annObj.speaker : undefined;
              const text =
                typeof annObj.text === "string"
                  ? annObj.text
                  : typeof annObj.word === "string"
                    ? annObj.word
                    : undefined;

              if (annObj.type === "word_info" || speaker) {
                words.push({ text, speaker });
              }
            }
          }
        }
      }
    }
  }

  if (words.length === 0 && Array.isArray(obj.candidates)) {
    for (const candidate of obj.candidates) {
      if (!candidate || typeof candidate !== "object") continue;
      const candObj = candidate as Record<string, unknown>;
      const candContent = candObj.content as Record<string, unknown> | undefined;
      if (candContent && Array.isArray(candContent.parts)) {
        for (const part of candContent.parts) {
          if (!part || typeof part !== "object") continue;
          const partObj = part as Record<string, unknown>;
          const audioTranscription = partObj.audioTranscription as
            | Record<string, unknown>
            | undefined;
          if (audioTranscription) {
            const speaker =
              typeof audioTranscription.speakerLabel === "string"
                ? audioTranscription.speakerLabel
                : undefined;
            if (Array.isArray(audioTranscription.words)) {
              for (const wordInfo of audioTranscription.words) {
                if (!wordInfo || typeof wordInfo !== "object") continue;
                const wordObj = wordInfo as Record<string, unknown>;
                const text =
                  typeof wordObj.word === "string"
                    ? wordObj.word
                    : typeof wordObj.text === "string"
                      ? wordObj.text
                      : undefined;
                const wordSpeaker = typeof wordObj.speaker === "string" ? wordObj.speaker : speaker;
                words.push({ text, speaker: wordSpeaker });
              }
            }
          }
        }
      }
    }
  }

  return words;
}

export function formatDiarizedTranscript(
  words: WordAnnotation[],
  rawOutputText: string,
): TranscriptionResult {
  const uniqueSpeakers = new Set<string>();
  for (const w of words) {
    if (w.speaker?.trim()) {
      uniqueSpeakers.add(w.speaker.trim());
    }
  }

  // If 1 or fewer distinct speakers detected, return clean plain text
  if (uniqueSpeakers.size <= 1) {
    return {
      text: rawOutputText.trim(),
      isMultiSpeaker: false,
    };
  }

  // Assign P1, P2, ... in order of first appearance
  const speakerOrder: string[] = [];
  for (const w of words) {
    if (w.speaker?.trim()) {
      const spk = w.speaker.trim();
      if (!speakerOrder.includes(spk)) {
        speakerOrder.push(spk);
      }
    }
  }

  interface SpeakerTurn {
    speaker: string;
    label: string;
    emoji: string;
    words: string[];
  }

  const turns: SpeakerTurn[] = [];
  let currentTurn: SpeakerTurn | null = null;

  for (const w of words) {
    const wordText = (w.text ?? "").trim();
    if (!wordText) continue;

    const rawSpeaker: string =
      w.speaker?.trim() || currentTurn?.speaker || speakerOrder[0] || "spk_1";
    const speakerIdx = speakerOrder.indexOf(rawSpeaker);
    const idx = speakerIdx >= 0 ? speakerIdx : 0;
    const label = `P${idx + 1}`;
    const emoji = SPEAKER_EMOJIS[idx % SPEAKER_EMOJIS.length];

    if (!currentTurn || currentTurn.speaker !== rawSpeaker) {
      currentTurn = {
        speaker: rawSpeaker,
        label,
        emoji,
        words: [wordText],
      };
      turns.push(currentTurn);
    } else {
      currentTurn.words.push(wordText);
    }
  }

  if (turns.length === 0) {
    return {
      text: rawOutputText.trim(),
      isMultiSpeaker: false,
    };
  }

  const htmlTurns: string[] = [];
  const plainTurns: string[] = [];

  for (const turn of turns) {
    const turnText = turn.words.join(" ");
    htmlTurns.push(`${turn.emoji} <b>${turn.label}:</b> ${escapeHtml(turnText)}`);
    plainTurns.push(`${turn.emoji} ${turn.label}: ${turnText}`);
  }

  return {
    text: plainTurns.join("\n\n"),
    isMultiSpeaker: true,
    htmlFormattedText: htmlTurns.join("\n\n"),
  };
}

export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string,
  languageCodes?: string[],
): Promise<TranscriptionResult> {
  const config = getConfig();
  const client = getGeminiClient();

  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  const audioFile = await client.files.upload({
    file: blob,
    config: { mimeType },
  });

  try {
    const inputType = mimeType.startsWith("video/") ? "video" : "audio";
    const enableDiarization = config.enable_diarization !== false;

    const transcriptionConfig: Record<string, unknown> = {};

    if (enableDiarization) {
      transcriptionConfig.mode = {
        type: "verbatim",
        diarization_mode: "speaker",
      };
    }

    if (languageCodes && languageCodes.length > 0) {
      transcriptionConfig.language_codes = languageCodes;
    }

    const hasTranscriptionConfig = Object.keys(transcriptionConfig).length > 0;

    const interaction = await client.interactions.create({
      model: config.model || "gemini-3.5-transcribe",
      input: [
        {
          type: inputType,
          uri: audioFile.uri,
          mime_type: audioFile.mimeType || mimeType,
        },
      ],
      generation_config: hasTranscriptionConfig
        ? {
            transcription_config: transcriptionConfig,
          }
        : undefined,
    });

    const rawText = (interaction.output_text ?? "").trim();

    if (!enableDiarization) {
      return {
        text: rawText,
        isMultiSpeaker: false,
      };
    }

    const words = extractWordAnnotations(interaction);
    return formatDiarizedTranscript(words, rawText);
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
