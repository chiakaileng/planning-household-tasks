/**
 * All tunables live here so importers never embed keys, models, prices, or timeouts.
 * Change .env (or this reader) when you switch models or want a different fetch timeout.
 */
export class AppConfig {
  readonly geminiApiKey: string;
  readonly llmBaseUrl: string;
  readonly llmModel: string;
  readonly llmInputPricePerMillionUsd: number;
  readonly llmOutputPricePerMillionUsd: number;
  readonly pageFetchTimeoutMs: number;
  readonly pageFetchUserAgent: string;
  readonly databaseUrl: string;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.geminiApiKey = env.GEMINI_API_KEY ?? "";
    this.llmBaseUrl = required(env, "LLM_BASE_URL");
    this.llmModel = required(env, "LLM_MODEL");
    this.llmInputPricePerMillionUsd = numberFromEnv(env, "LLM_INPUT_PRICE_PER_MILLION_USD");
    this.llmOutputPricePerMillionUsd = numberFromEnv(env, "LLM_OUTPUT_PRICE_PER_MILLION_USD");
    this.pageFetchTimeoutMs = numberFromEnv(env, "PAGE_FETCH_TIMEOUT_MS");
    this.pageFetchUserAgent = required(env, "PAGE_FETCH_USER_AGENT");
    this.databaseUrl = required(env, "DATABASE_URL");
  }

  hasGeminiKey(): boolean {
    return this.geminiApiKey.trim().length > 0;
  }

  estimateUsd(inputTokens: number, outputTokens: number): number {
    const input = (inputTokens / 1_000_000) * this.llmInputPricePerMillionUsd;
    const output = (outputTokens / 1_000_000) * this.llmOutputPricePerMillionUsd;
    return input + output;
  }
}

function required(env: Record<string, string | undefined>, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.`);
  }
  return value;
}

function numberFromEnv(env: Record<string, string | undefined>, name: string): number {
  const parsed = Number(required(env, name));
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }
  return parsed;
}
