import { describe, expect, it } from "vitest";
import { defaultMealSlots } from "@/config/weekMeals";
import { ExtraMealPlacement } from "@/domain/plan/ExtraMealPlacement";

const placement = new ExtraMealPlacement(defaultMealSlots);

describe("ExtraMealPlacement", () => {
  it("puts a week-only extra after lunch and not on the next week", () => {
    const template = {
      id: "snack",
      name: "Snack",
      insertAfterSlotKey: "lunch",
      appliesFromWeek: "2026-09-14",
      recurs: false,
    };
    const thisWeek = placement.slotsForWeek("2026-09-14", [template]).map((slot) => slot.name);
    expect(thisWeek).toEqual(["Breakfast", "Lunch", "Snack", "Dinner"]);
    const nextWeek = placement.slotsForWeek("2026-09-21", [template]).map((slot) => slot.name);
    expect(nextWeek).toEqual(["Breakfast", "Lunch", "Dinner"]);
  });

  it("copies a recurring extra to later weeks", () => {
    const template = {
      id: "tea",
      name: "Tea",
      insertAfterSlotKey: "lunch",
      appliesFromWeek: "2026-09-14",
      recurs: true,
    };
    expect(placement.slotsForWeek("2026-09-21", [template]).map((slot) => slot.name)).toContain("Tea");
    expect(placement.slotsForWeek("2026-09-07", [template]).map((slot) => slot.name)).not.toContain("Tea");
  });
});
