import { describe, expect, it } from "vitest";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { emptyRecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import { RecipeRefreshMerger } from "@/domain/recipe/RecipeRefreshMerger";

const merger = new RecipeRefreshMerger();

function draft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    title: "Saved noodles",
    servings: 2,
    ingredients: [{ name: "noodles", quantity: "1", unit: "pack", note: null, parseFlagged: false }],
    steps: ["Boil."],
    sourceType: "url",
    sourceUrl: "https://example.test/noodles",
    sourceText: null,
    notes: "kid likes this",
    tags: ["family"],
    emojis: ["🍜"],
    ...emptyRecipeNutrition(),
    ...overrides,
  };
}

describe("RecipeRefreshMerger", () => {
  it("fills empty nutrition and servings from the source, and updates stated values", () => {
    const merged = merger.apply(
      draft({ calories: 400, protein: null }),
      draft({
        title: "Site title",
        servings: 4,
        calories: 420,
        protein: 18,
        fat: 12,
        carbohydrates: 45,
        fibre: 6,
        notes: null,
        tags: [],
        emojis: [],
      }),
    );

    expect(merged).toMatchObject({
      title: "Saved noodles",
      servings: 4,
      calories: 420,
      protein: 18,
      fat: 12,
      carbohydrates: 45,
      fibre: 6,
      notes: "kid likes this",
      tags: ["family"],
      emojis: ["🍜"],
    });
  });

  it("keeps a current value when the source still omits that field", () => {
    const merged = merger.apply(draft({ calories: 480, fibre: 3 }), draft({ calories: null, fibre: 0 }));
    expect(merged.calories).toBe(480);
    expect(merged.fibre).toBe(0);
  });
});
