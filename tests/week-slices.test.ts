import { describe, expect, it } from "vitest";
import type { PlannedMeal } from "@/domain/plan/PlannedMeal";
import { WeekSlices } from "@/domain/plan/WeekSlices";

const slices = new WeekSlices();

describe("WeekSlices", () => {
  it("merges this week with next and knows which days are later", () => {
    const currentDays = ["2099-03-02", "2099-03-08"];
    const nextDays = ["2099-03-09", "2099-03-15"];
    expect(slices.mergeDays(currentDays, nextDays)).toEqual([
      "2099-03-02",
      "2099-03-08",
      "2099-03-09",
      "2099-03-15",
    ]);
    expect(slices.isAfterWeek("2099-03-09", currentDays)).toBe(true);
    expect(slices.isAfterWeek("2099-03-08", currentDays)).toBe(false);
  });

  it("keeps one meal per id when merging", () => {
    const breakfast = meal("a", "2099-03-02");
    const updated = { ...breakfast, name: "Breakfast (updated)" };
    const nextLunch = meal("b", "2099-03-09");
    expect(slices.mergeMeals([breakfast], [updated, nextLunch])).toEqual([updated, nextLunch]);
  });
});

function meal(id: string, date: string): PlannedMeal {
  return {
    id,
    date,
    slotKey: "breakfast",
    name: "Breakfast",
    sortOrder: 0,
    isExtra: false,
    dishes: [],
  };
}
