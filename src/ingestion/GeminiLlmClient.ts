import type { AppConfig } from "@/config/AppConfig";
import type { ILlmClient, LlmJsonResult } from "@/ingestion/ILlmClient";

/**
 * Gemini generateContent transport. Model and host come from AppConfig.
 */
export class GeminiLlmClient implements ILlmClient {
  constructor(private readonly config: AppConfig) {}

  async completeJson<T>(request: { prompt: string; responseSchema: unknown }): Promise<LlmJsonResult<T>> {
    const url = `${trimSlash(this.config.llmBaseUrl)}/models/${this.config.llmModel}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": this.config.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: request.prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: request.responseSchema,
        },
      }),
    });

    const body = (await response.json()) as GeminiResponse;
    const inputTokens = body.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = body.usageMetadata?.candidatesTokenCount ?? 0;

    if (!response.ok) {
      return {
        ok: false,
        message: body.error?.message ?? `Gemini request failed (HTTP ${response.status}).`,
        inputTokens,
        outputTokens,
      };
    }

    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return {
        ok: false,
        message: "Gemini returned an empty response.",
        inputTokens,
        outputTokens,
      };
    }

    try {
      return {
        ok: true,
        value: JSON.parse(text) as T,
        inputTokens,
        outputTokens,
      };
    } catch {
      return {
        ok: false,
        message: "Gemini returned text that was not valid JSON.",
        inputTokens,
        outputTokens,
      };
    }
  }
}

function trimSlash(value: string): string {
  return value.replace(/\/$/, "");
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
};
