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
  readonly weekTimeZone: string;
  readonly weekStartsOn: number;
  readonly leftoverLookbackDays: number;
  readonly telegramBotToken: string;
  readonly telegramChatId: string;
  readonly telegramApiBaseUrl: string;
  readonly telegramDateLocale: string;
  readonly telegramWeeklyWeekday: number;
  readonly telegramWeeklyHour: number;
  readonly telegramNightBeforeHour: number;
  readonly telegramSendTimeoutMs: number;
  readonly telegramSchedulerIntervalMs: number;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.geminiApiKey = env.GEMINI_API_KEY ?? "";
    this.llmBaseUrl = required(env, "LLM_BASE_URL");
    this.llmModel = required(env, "LLM_MODEL");
    this.llmInputPricePerMillionUsd = numberFromEnv(env, "LLM_INPUT_PRICE_PER_MILLION_USD");
    this.llmOutputPricePerMillionUsd = numberFromEnv(env, "LLM_OUTPUT_PRICE_PER_MILLION_USD");
    this.pageFetchTimeoutMs = numberFromEnv(env, "PAGE_FETCH_TIMEOUT_MS");
    this.pageFetchUserAgent = required(env, "PAGE_FETCH_USER_AGENT");
    this.databaseUrl = required(env, "DATABASE_URL");
    this.weekTimeZone = required(env, "WEEK_TIMEZONE");
    this.weekStartsOn = numberFromEnv(env, "WEEK_STARTS_ON");
    this.leftoverLookbackDays = numberFromEnv(env, "LEFTOVER_LOOKBACK_DAYS");
    this.telegramBotToken = env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
    this.telegramChatId = env.TELEGRAM_CHAT_ID?.trim() ?? "";
    this.telegramApiBaseUrl = env.TELEGRAM_API_BASE_URL?.trim() || "https://api.telegram.org";
    this.telegramDateLocale = env.TELEGRAM_DATE_LOCALE?.trim() || "en-SG";
    this.telegramWeeklyWeekday = optionalNumberFromEnv(env, "TELEGRAM_WEEKLY_WEEKDAY", 0);
    this.telegramWeeklyHour = optionalNumberFromEnv(env, "TELEGRAM_WEEKLY_HOUR", 19);
    this.telegramNightBeforeHour = optionalNumberFromEnv(env, "TELEGRAM_NIGHT_BEFORE_HOUR", 20);
    this.telegramSendTimeoutMs = optionalNumberFromEnv(env, "TELEGRAM_SEND_TIMEOUT_MS", 10000);
    this.telegramSchedulerIntervalMs = optionalNumberFromEnv(env, "TELEGRAM_SCHEDULER_INTERVAL_MS", 30000);
    if (this.weekStartsOn < 0 || this.weekStartsOn > 6) {
      throw new Error("WEEK_STARTS_ON must be 0 (Sunday) through 6 (Saturday).");
    }
    if (this.leftoverLookbackDays < 1) {
      throw new Error("LEFTOVER_LOOKBACK_DAYS must be at least 1.");
    }
    if (this.telegramWeeklyWeekday < 0 || this.telegramWeeklyWeekday > 6) {
      throw new Error("TELEGRAM_WEEKLY_WEEKDAY must be 0 (Sunday) through 6 (Saturday).");
    }
    if (this.telegramWeeklyHour < 0 || this.telegramWeeklyHour > 23) {
      throw new Error("TELEGRAM_WEEKLY_HOUR must be 0 through 23.");
    }
    if (this.telegramNightBeforeHour < 0 || this.telegramNightBeforeHour > 23) {
      throw new Error("TELEGRAM_NIGHT_BEFORE_HOUR must be 0 through 23.");
    }
  }

  hasGeminiKey(): boolean {
    return this.geminiApiKey.trim().length > 0;
  }

  hasTelegramCredentials(): boolean {
    return this.telegramBotToken.length > 0 && this.telegramChatId.length > 0;
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

function optionalNumberFromEnv(
  env: Record<string, string | undefined>,
  name: string,
  fallback: number,
): number {
  const raw = env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }
  return parsed;
}
