import { emptyRecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { sourceTypeFrom } from "@/domain/recipe/RecipeSource";

/**
 * A titled paste for the recipe library. The body is kept as source text and
 * as one step so /cook has something to show without an LLM extract.
 */
export class RecipePasteDraft {
  fromTitleAndText(title: string, text: string): RecipeDraft | null {
    const name = title.trim();
    const sourceText = text.trim();
    if (!name || !sourceText) {
      return null;
    }
    return {
      title: name,
      servings: null,
      ingredients: [],
      steps: [sourceText],
      sourceType: sourceTypeFrom(null, sourceText, "pasted"),
      sourceUrl: null,
      sourceText,
      notes: null,
      tags: [],
      emojis: [],
      ...emptyRecipeNutrition(),
    };
  }
}
