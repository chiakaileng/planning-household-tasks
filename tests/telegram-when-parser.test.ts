import { describe, expect, it } from "vitest";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import { WeekRange } from "@/domain/plan/WeekRange";
import { TelegramWhenParser } from "@/domain/telegram/TelegramWhenParser";

const now = new Date("2026-09-13T12:00:00+08:00");
const calendar = new CalendarDate("Asia/Singapore");
const weeks = new WeekRange(calendar, 1);
const parser = new TelegramWhenParser(calendar, weeks);

describe("TelegramWhenParser", () => {
  it("parses fri sat dinner as two Friday/Saturday dinners this week", () => {
    expect(parser.parse("fri sat dinner", now)).toEqual({
      kind: "ok",
      slots: [
        { date: "2026-09-11", slotKey: "dinner" },
        { date: "2026-09-12", slotKey: "dinner" },
      ],
    });
  });

  it("parses mixed meals and next Tuesday", () => {
    expect(parser.parse("fri dinner sat lunch", now)).toEqual({
      kind: "ok",
      slots: [
        { date: "2026-09-11", slotKey: "dinner" },
        { date: "2026-09-12", slotKey: "lunch" },
      ],
    });
    expect(parser.parse("next tue dinner", now)).toEqual({
      kind: "ok",
      slots: [{ date: "2026-09-15", slotKey: "dinner" }],
    });
  });

  it("accepts full day names and meal initials, case-insensitive", () => {
    expect(parser.parse("Friday D", now)).toEqual({
      kind: "ok",
      slots: [{ date: "2026-09-11", slotKey: "dinner" }],
    });
  });

  it("marks a day without a meal as incomplete", () => {
    expect(parser.parse("fri", now)).toEqual({ kind: "incomplete", days: ["2026-09-11"] });
  });

  it("rejects a meal without a day or an extra-meal name", () => {
    expect(parser.parse("dinner", now)).toEqual({ kind: "invalid" });
    expect(parser.parse("fri snack", now)).toEqual({ kind: "invalid" });
  });

  it("splits search from a when suffix", () => {
    expect(parser.splitSearch("tomato soup fri dinner", now)).toEqual({
      search: "tomato soup",
      when: { kind: "ok", slots: [{ date: "2026-09-11", slotKey: "dinner" }] },
    });
    expect(parser.splitSearch("tomato soup", now)).toEqual({
      search: "tomato soup",
      when: { kind: "none" },
    });
  });

  it("expands /cook today to every usual slot", () => {
    const parsed = parser.parseCookWhen("today", now);
    expect(parsed.kind).toBe("ok");
    if (parsed.kind === "ok") {
      expect(parsed.slots.map((slot) => slot.slotKey)).toEqual(["breakfast", "lunch", "dinner"]);
      expect(parsed.slots.every((slot) => slot.date === "2026-09-13")).toBe(true);
    }
  });
});
