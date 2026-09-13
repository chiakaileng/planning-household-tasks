import { describe, expect, it } from "vitest";
import { LeftoverSourceChoice } from "@/domain/plan/LeftoverSourceChoice";
import type { LeftoverSourceMeal, PlannedMeal } from "@/domain/plan/PlannedMeal";

const choice = new LeftoverSourceChoice();

describe("LeftoverSourceChoice", () => {
  it("shows the dishes on a selected meal and skips the destination meal", () => {
    const dinner = source("wed-dinner", "2026-09-16", "dinner", "Dinner", [
      { id: "soya", title: "soya sauce chicken" },
      { id: "wings", title: "dump and bake chicken wings" },
    ]);
    const thursday = source("thu-dinner", "2026-09-17", "dinner", "Dinner", [{ id: "rice", title: "Rice" }]);
    const meals = choice.meals([dinner, thursday], "thu-dinner");
    expect(meals.map((meal) => meal.id)).toEqual(["wed-dinner"]);
    expect(choice.dishes(dinner, null).map((dish) => dish.title)).toEqual([
      "soya sauce chicken",
      "dump and bake chicken wings",
    ]);
  });

  it("fills leftover sources from meals already on the week board", () => {
    const board: PlannedMeal[] = [
      {
        id: "wed-dinner",
        date: "2026-09-16",
        slotKey: "dinner",
        name: "Dinner",
        sortOrder: 300,
        isExtra: false,
        dishes: [
          {
            id: "soya",
            mealId: "wed-dinner",
            contentType: "recipe",
            recipeId: "r",
            recipeMissing: false,
            sourceUrl: null,
            sourceMealId: null,
            sourceDishId: null,
            leftoverText: null,
            freeformText: null,
            title: "soya sauce chicken",
            cookMemberId: null,
            cookName: "",
            eaters: [],
            sortOrder: 0,
          },
        ],
      },
    ];
    const merged = choice.withBoard([], board);
    expect(merged[0]?.dishes.map((dish) => dish.title)).toEqual(["soya sauce chicken"]);
  });
});

function source(
  id: string,
  date: string,
  slotKey: string,
  name: string,
  dishes: LeftoverSourceMeal["dishes"],
): LeftoverSourceMeal {
  return { id, date, slotKey, name, label: `${name} · ${date}`, dishes };
}
