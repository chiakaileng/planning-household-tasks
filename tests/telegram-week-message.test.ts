import { describe, expect, it } from "vitest";
import { TelegramDateCaption } from "@/domain/plan/TelegramDateCaption";
import { TelegramWeekMessage } from "@/domain/plan/TelegramWeekMessage";
import type { PlannedDish, PlannedMeal } from "@/domain/plan/PlannedMeal";

const days = ["2026-03-16", "2026-03-17", "2026-03-18", "2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22"];
const messages = new TelegramWeekMessage(new TelegramDateCaption("Asia/Singapore", "en-SG"));

describe("TelegramWeekMessage", () => {
  it("lists every day, extras after the slot they follow, and cook names", () => {
    const afterLunch = weekMeals(250);
    expect(messages.week(days, afterLunch)).toBe(
      [
        "This week · 16–22 Mar",
        "",
        "Mon",
        "• Breakfast — Oats · Ada cooks",
        "• Dinner — Pasta · Ada cooks",
        "",
        "Tue",
        "• Lunch — Leftovers of Monday dinner · Kai cooks",
        "",
        "Wed",
        "• Dinner — Soup · Ada cooks",
        "",
        "Thu",
        "• (nothing planned)",
        "",
        "Fri",
        "• Breakfast — Eggs · Ada cooks",
        "• Lunch — Takeaway noodles · Kai cooks",
        "• Snack — Fruit plate · Ada cooks",
        "• Dinner — Pizza · Kai cooks",
        "",
        "Sat",
        "• (nothing planned)",
        "",
        "Sun",
        "• Dinner — Roast chicken · Ada cooks",
      ].join("\n"),
    );
  });

  it("places an extra after dinner when that is its calendar order", () => {
    const text = messages.week(days, weekMeals(350));
    const friday = text.split("\n\n").find((block) => block.startsWith("Fri"));
    expect(friday).toBe(
      [
        "Fri",
        "• Breakfast — Eggs · Ada cooks",
        "• Lunch — Takeaway noodles · Kai cooks",
        "• Dinner — Pizza · Kai cooks",
        "• Snack — Fruit plate · Ada cooks",
      ].join("\n"),
    );
  });

  it("omits the cook clause when the name is blank", () => {
    const meals = [meal("2026-03-16", "breakfast", "Breakfast", 100, [dish("Oats", "  ")])];
    expect(messages.week(["2026-03-16"], meals)).toContain("• Breakfast — Oats");
    expect(messages.week(["2026-03-16"], meals)).not.toContain("cooks");
  });

  it("says nothing planned tomorrow when that day is empty", () => {
    expect(messages.tomorrow("2026-03-19", [])).toBe("Tomorrow · Thu 19 Mar\n\nNothing planned tomorrow.");
  });

  it("links the dish title to the source URL instead of printing a raw address", () => {
    const meals = [
      meal("2026-03-16", "dinner", "Dinner", 300, [
        { ...dish("Pasta", "Ada"), sourceUrl: "https://example.test/pasta" },
      ]),
    ];
    expect(messages.week(["2026-03-16"], meals)).toContain(
      '• Dinner — <a href="https://example.test/pasta">Pasta</a> · Ada cooks',
    );
    expect(messages.week(["2026-03-16"], meals)).not.toContain("\nhttps://");
  });

  it("lists tomorrow’s meals when there are dishes", () => {
    const meals = [
      meal("2026-03-17", "lunch", "Lunch", 200, [dish("Leftovers of Monday dinner", "Kai")]),
    ];
    expect(messages.tomorrow("2026-03-17", meals)).toBe(
      "Tomorrow · Tue 17 Mar\n\n• Lunch — Leftovers of Monday dinner · Kai cooks",
    );
  });
});

function weekMeals(snackOrder: number): PlannedMeal[] {
  return [
    meal("2026-03-16", "breakfast", "Breakfast", 100, [dish("Oats", "Ada")]),
    meal("2026-03-16", "dinner", "Dinner", 300, [dish("Pasta", "Ada")]),
    meal("2026-03-17", "lunch", "Lunch", 200, [dish("Leftovers of Monday dinner", "Kai")]),
    meal("2026-03-18", "dinner", "Dinner", 300, [dish("Soup", "Ada")]),
    meal("2026-03-20", "breakfast", "Breakfast", 100, [dish("Eggs", "Ada")]),
    meal("2026-03-20", "lunch", "Lunch", 200, [dish("Takeaway noodles", "Kai")]),
    meal("2026-03-20", "snack", "Snack", snackOrder, [dish("Fruit plate", "Ada")], true),
    meal("2026-03-20", "dinner", "Dinner", 300, [dish("Pizza", "Kai")]),
    meal("2026-03-22", "dinner", "Dinner", 300, [dish("Roast chicken", "Ada")]),
  ];
}

function meal(
  date: string,
  slotKey: string,
  name: string,
  sortOrder: number,
  dishes: PlannedDish[],
  isExtra = false,
): PlannedMeal {
  return { id: `${date}-${slotKey}`, date, slotKey, name, sortOrder, isExtra, dishes };
}

function dish(title: string, cookName: string): PlannedDish {
  return {
    id: title,
    mealId: "meal",
    contentType: "recipe",
    recipeId: "r",
    recipeMissing: false,
    sourceMealId: null,
    sourceDishId: null,
    leftoverText: null,
    freeformText: null,
    title,
    cookMemberId: cookName.trim() ? "m" : null,
    cookName,
    eaters: [],
    sortOrder: 0,
    sourceUrl: null,
  };
}
