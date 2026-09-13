import { describe, expect, it } from "vitest";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import { LeftoverSourceHorizon } from "@/domain/plan/LeftoverSourceHorizon";
import { LeftoverWindow } from "@/domain/plan/LeftoverWindow";
import { WeekRange } from "@/domain/plan/WeekRange";

const calendar = new CalendarDate("Asia/Singapore");
const weeks = new WeekRange(calendar, 1);

describe("WeekRange", () => {
  it("starts the week on Monday", () => {
    expect(weeks.startOfWeek("2026-09-16")).toBe("2026-09-14");
    expect(weeks.days("2026-09-16")).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
      "2026-09-20",
    ]);
  });

  it("treats Sunday night’s coming week as the Monday that starts tomorrow", () => {
    expect(weeks.comingWeekStart(new Date("2026-03-15T12:00:00.000Z"))).toBe("2026-03-16");
  });

  it("names the last day and the Monday after this week", () => {
    expect(weeks.lastDay("2026-09-16")).toBe("2026-09-20");
    expect(weeks.nextWeekStart("2026-09-16")).toBe("2026-09-21");
  });
});

describe("LeftoverWindow", () => {
  const window = new LeftoverWindow(calendar, 7);

  it("includes today and the six days before", () => {
    expect(window.firstDate("2026-09-13")).toBe("2026-09-07");
    expect(window.includes("2026-09-07", "2026-09-13")).toBe(true);
    expect(window.includes("2026-09-13", "2026-09-13")).toBe(true);
    expect(window.includes("2026-09-06", "2026-09-13")).toBe(false);
  });
});

describe("LeftoverSourceHorizon", () => {
  it("runs from the lookback through the end of next week", () => {
    const horizon = new LeftoverSourceHorizon(new LeftoverWindow(calendar, 7), weeks);
    expect(horizon.range("2026-09-13")).toEqual({ from: "2026-09-07", to: "2026-09-20" });
  });
});
