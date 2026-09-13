import type { Ingredient } from "@/domain/recipe/Ingredient";
import type { RecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import type { SourceType } from "@/domain/recipe/SourceType";

/**
 * In-memory recipe before the user confirms save.
 * extractFromPastedText returns this and must not persist it.
 */
export type RecipeDraft = RecipeNutrition & {
  title: string;
  servings: number | null;
  ingredients: Ingredient[];
  steps: string[];
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceText: string | null;
  /** Household reminder. Extract leaves this empty; you fill it on review. */
  notes: string | null;
  /** Normalized tag names. Extract leaves this empty. */
  tags: string[];
  /** Up to three food icons. Extract leaves this empty; we suggest from the catalog. */
  emojis: string[];
};
