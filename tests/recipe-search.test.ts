import { describe, expect, it } from "vitest";
import { RecipeSearch } from "@/domain/plan/RecipeSearch";
import { emptyRecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";

const search = new RecipeSearch();

function recipe(overrides: Partial<SavedRecipe> = {}): SavedRecipe {
  return {
    id: "r1",
    title: "Tomato soup",
    servings: 2,
    ingredients: [{ name: "tomato", quantity: "2", unit: null, note: null, parseFlagged: false }],
    steps: ["Simmer until thick."],
    sourceType: "pasted",
    sourceUrl: null,
    sourceText: "soup",
    notes: "kid likes this",
    tags: ["child"],
    emojis: [],
    ...emptyRecipeNutrition(),
    ...overrides,
  };
}

describe("RecipeSearch", () => {
  it("matches title, notes, tags, ingredients, and steps", () => {
    expect(search.matches(recipe(), "tomato soup")).toBe(true);
    expect(search.matches(recipe(), "kid likes")).toBe(true);
    expect(search.matches(recipe(), "CHILD")).toBe(true);
    expect(search.matches(recipe(), "simmer")).toBe(true);
    expect(search.matches(recipe(), "pizza")).toBe(false);
  });

  it("treats a blank query as no filter", () => {
    expect(search.filter([recipe()], "   ")).toHaveLength(1);
  });
});
