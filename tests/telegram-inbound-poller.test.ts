import { describe, expect, it } from "vitest";
import { AppConfig } from "@/config/AppConfig";
import type { ITelegramBotApi, TelegramUpdate } from "@/announce/ITelegramBotApi";
import { TelegramInboundPoller } from "@/announce/TelegramInboundPoller";
import type { TelegramInboundHandler } from "@/announce/TelegramInboundHandler";
import type { ITelegramUpdateOffsetStore } from "@/announce/TelegramUpdateOffsetStore";

function testConfig(chat = "-1001") {
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
    TELEGRAM_BOT_TOKEN: chat ? "token" : "",
    TELEGRAM_CHAT_ID: chat,
  });
}

class MemoryOffset implements ITelegramUpdateOffsetStore {
  value: number | null = null;
  async read() {
    return this.value;
  }
  async write(offset: number) {
    this.value = offset;
  }
}

describe("TelegramInboundPoller", () => {
  it("does nothing when token or chat id is missing", async () => {
    const calls: number[] = [];
    const api = {
      getUpdates: async () => {
        calls.push(1);
        return [];
      },
    } as unknown as ITelegramBotApi;
    const poller = new TelegramInboundPoller(testConfig(""), api, {} as TelegramInboundHandler, new MemoryOffset());
    await poller.tick();
    expect(calls).toEqual([]);
  });

  it("skips backlog on the first run and does not handle those updates", async () => {
    const handled: number[] = [];
    const batches = [
      [{ updateId: 40 }, { updateId: 41 }] as TelegramUpdate[],
      [] as TelegramUpdate[],
    ];
    const api = {
      getUpdates: async () => batches.shift() ?? [],
    } as unknown as ITelegramBotApi;
    const handler = { handle: async (update: TelegramUpdate) => handled.push(update.updateId) } as unknown as TelegramInboundHandler;
    const offset = new MemoryOffset();
    const poller = new TelegramInboundPoller(testConfig(), api, handler, offset);
    await poller.tick();
    expect(handled).toEqual([]);
    expect(offset.value).toBe(42);
  });
});
