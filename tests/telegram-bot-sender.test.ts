import { describe, expect, it } from "vitest";
import { TelegramBotSender } from "@/announce/TelegramBotSender";
import { AppConfig } from "@/config/AppConfig";

function testConfig(overrides: Record<string, string> = {}) {
  return new AppConfig({
    GEMINI_API_KEY: "test-key",
    LLM_BASE_URL: "https://example.test/v1beta",
    LLM_MODEL: "test-model",
    LLM_INPUT_PRICE_PER_MILLION_USD: "0.30",
    LLM_OUTPUT_PRICE_PER_MILLION_USD: "2.50",
    PAGE_FETCH_TIMEOUT_MS: "1000",
    PAGE_FETCH_USER_AGENT: "test-agent",
    DATABASE_URL: "file:./dev.db",
    WEEK_TIMEZONE: "Asia/Singapore",
    WEEK_STARTS_ON: "1",
    LEFTOVER_LOOKBACK_DAYS: "7",
    ...overrides,
  });
}

describe("TelegramBotSender", () => {
  it("does not call Telegram when token or chat id is missing", async () => {
    const sender = new TelegramBotSender(testConfig());
    const result = await sender.send("hello");
    expect(result).toEqual({
      ok: false,
      error: "Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env.",
    });
  });
});
