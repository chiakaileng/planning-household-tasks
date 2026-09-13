import { describe, expect, it } from "vitest";
import { MemberWeekRecap } from "@/domain/plan/MemberWeekRecap";
import type { PlannedDish, PlannedMeal } from "@/domain/plan/PlannedMeal";

const recap = new MemberWeekRecap();
const days = ["2099-01-04", "2099-01-05"];

function dish(overrides: Partial<PlannedDish> & Pick<PlannedDish, "id" | "mealId">): PlannedDish {
  return {
    contentType: "recipe",
    recipeId: "recipe-1",
    recipeMissing: false,
    sourceMealId: null,
    sourceDishId: null,
    leftoverText: null,
    freeformText: null,
    title: "Noodles",
    cookMemberId: "adult",
    cookName: "Ada",
    eaters: [{ memberId: "kid", name: "Kai" }],
    sortOrder: 0,
    sourceUrl: null,
    ...overrides,
  };
}

function meal(overrides: Partial<PlannedMeal> & Pick<PlannedMeal, "id" | "date" | "dishes">): PlannedMeal {
  return {
    slotKey: "dinner",
    name: "Dinner",
    sortOrder: 300,
    isExtra: false,
    ...overrides,
  };
}

describe("MemberWeekRecap", () => {
  it("groups eat, cook, and both-role dishes onto the member’s days", () => {
    const meals = [
      meal({
        id: "mon-dinner",
        date: "2099-01-04",
        dishes: [
          dish({
            id: "eat-only",
            mealId: "mon-dinner",
            title: "Nuggets",
            cookMemberId: "adult",
            eaters: [{ memberId: "kid", name: "Kai" }],
          }),
          dish({
            id: "both",
            mealId: "mon-dinner",
            title: "Noodles",
            cookMemberId: "kid",
            cookName: "Kai",
            eaters: [{ memberId: "kid", name: "Kai" }],
            sortOrder: 1,
          }),
        ],
      }),
      meal({
        id: "tue-dinner",
        date: "2099-01-05",
        dishes: [
          dish({
            id: "cook-only",
            mealId: "tue-dinner",
            title: "Soup",
            cookMemberId: "kid",
            cookName: "Kai",
            eaters: [{ memberId: "adult", name: "Ada" }],
          }),
        ],
      }),
    ];

    const kidDays = recap.daysFor("kid", meals, days);
    expect(kidDays).toHaveLength(2);
    expect(kidDays[0]?.dishes.map((item) => [item.title, item.role])).toEqual([
      ["Nuggets", "eats"],
      ["Noodles", "both"],
    ]);
    expect(kidDays[1]?.dishes.map((item) => [item.title, item.role])).toEqual([["Soup", "cooks"]]);
  });

  it("splits a both-role dish onto the eat row and the cook row", () => {
    const meals = [
      meal({
        id: "mon-dinner",
        date: "2099-01-04",
        dishes: [
          dish({
            id: "both",
            mealId: "mon-dinner",
            title: "Noodles",
            cookMemberId: "kid",
            cookName: "Kai",
            eaters: [{ memberId: "kid", name: "Kai" }],
          }),
        ],
      }),
    ];
    expect(recap.daysFor("kid", meals, days, "eats")[0]?.dishes.map((item) => item.role)).toEqual(["eats"]);
    expect(recap.daysFor("kid", meals, days, "cooks")[0]?.dishes.map((item) => item.role)).toEqual(["cooks"]);
  });

  it("keeps every week day when nothing is assigned", () => {
    const empty = recap.daysFor("kid", [], days);
    expect(empty).toEqual([
      { date: "2099-01-04", dishes: [] },
      { date: "2099-01-05", dishes: [] },
    ]);
  });

  it("does not show another member’s dishes", () => {
    const meals = [
      meal({
        id: "mon-dinner",
        date: "2099-01-04",
        dishes: [dish({ id: "ada", mealId: "mon-dinner", cookMemberId: "adult", eaters: [{ memberId: "adult", name: "Ada" }] })],
      }),
    ];
    expect(recap.daysFor("kid", meals, days)[0]?.dishes).toEqual([]);
  });
});
