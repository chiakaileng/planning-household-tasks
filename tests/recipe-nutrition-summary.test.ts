import { describe, expect, it } from "vitest";
import { emptyRecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import { RecipeNutritionSummary } from "@/domain/recipe/RecipeNutritionSummary";

const summary = new RecipeNutritionSummary();

describe("RecipeNutritionSummary", () => {
  it("joins only the fields that are present", () => {
    expect(summary.format({ ...emptyRecipeNutrition(), calories: 420, protein: 18, fibre: 6 })).toBe(
      "420 kcal · 18g protein · 6g fibre",
    );
    expect(summary.format(emptyRecipeNutrition())).toBe("");
  });
});
