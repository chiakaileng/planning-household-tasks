import { describe, expect, it } from "vitest";
import { RecipeNutritionParser } from "@/ingestion/RecipeNutritionParser";

const parser = new RecipeNutritionParser();

describe("RecipeNutritionParser", () => {
  it("reads schema.org nutrition including fibre as fiberContent", () => {
    expect(
      parser.parse({
        calories: "250 calories",
        proteinContent: "18 g",
        fatContent: "9.4 g",
        carbohydrateContent: "32 g",
        fiberContent: "6 g",
      }),
    ).toEqual({
      calories: 250,
      protein: 18,
      fat: 9.4,
      carbohydrates: 32,
      fibre: 6,
    });
  });

  it("reads British fibre and a raw calorie number", () => {
    expect(parser.parse(380)).toEqual({
      calories: 380,
      protein: null,
      fat: null,
      carbohydrates: null,
      fibre: null,
    });
    expect(parser.parse({ fibre: "0 g", protein: 12 })).toMatchObject({ protein: 12, fibre: 0 });
    expect(parser.parseCalories("1,200 kcal")).toBe(1200);
  });

  it("returns empty nutrition when values are missing", () => {
    expect(parser.parse(null)).toEqual({
      calories: null,
      protein: null,
      fat: null,
      carbohydrates: null,
      fibre: null,
    });
  });
});
