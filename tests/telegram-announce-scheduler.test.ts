import { describe, expect, it } from "vitest";
import { AnnounceClock } from "@/announce/AnnounceClock";
import type { ITelegramSender } from "@/announce/ITelegramSender";
import { TelegramAnnounceScheduler } from "@/announce/TelegramAnnounceScheduler";
import { TelegramAnnouncer } from "@/announce/TelegramAnnouncer";
import { AppConfig } from "@/config/AppConfig";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import { WeekRange } from "@/domain/plan/WeekRange";
import type { WeekMealPlanner } from "@/planning/WeekMealPlanner";

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

const emptyWeek = {
  weekStart: "2026-03-16",
  days: ["2026-03-16"],
  today: "2026-03-15",
  meals: [],
};

function planner(): WeekMealPlanner {
  return {
    calendar: new CalendarDate("Asia/Singapore"),
    loadWeek: async () => emptyWeek,
  } as unknown as WeekMealPlanner;
}

describe("TelegramAnnounceScheduler", () => {
  it("does not call the sender when credentials are missing", async () => {
    const sent: string[] = [];
    const sender: ITelegramSender = {
      send: async (text) => {
        sent.push(text);
        return { ok: true };
      },
    };
    const config = testConfig();
    const weeks = new WeekRange(new CalendarDate(config.weekTimeZone), config.weekStartsOn);
    const scheduler = new TelegramAnnounceScheduler(
      config,
      new AnnounceClock(config.weekTimeZone),
      new TelegramAnnouncer(config, planner(), sender, weeks),
    );
    await scheduler.tick(new Date("2026-03-15T11:00:00.000Z"));
    expect(sent).toEqual([]);
  });

  it("sends coming week at Sunday 19:00 and tomorrow at 20:00, once each", async () => {
    const sent: string[] = [];
    const sender: ITelegramSender = {
      send: async (text) => {
        sent.push(text);
        return { ok: true };
      },
    };
    const config = testConfig({
      TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_CHAT_ID: "123",
    });
    const weeks = new WeekRange(new CalendarDate(config.weekTimeZone), config.weekStartsOn);
    const scheduler = new TelegramAnnounceScheduler(
      config,
      new AnnounceClock(config.weekTimeZone),
      new TelegramAnnouncer(config, planner(), sender, weeks),
    );

    await scheduler.tick(new Date("2026-03-15T11:00:00.000Z"));
    await scheduler.tick(new Date("2026-03-15T11:00:30.000Z"));
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain("This week");

    await scheduler.tick(new Date("2026-03-15T12:00:00.000Z"));
    await scheduler.tick(new Date("2026-03-15T12:00:30.000Z"));
    expect(sent).toHaveLength(2);
    expect(sent[1]).toContain("Nothing planned tomorrow.");
  });
});
