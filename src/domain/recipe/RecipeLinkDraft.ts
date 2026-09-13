import { emptyRecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { emptyToNullSource, sourceTypeFrom } from "@/domain/recipe/RecipeSource";

/**
 * A URL with no parsed recipe. Title is a host hint you can edit; Telegram still gets the link.
 */
export class RecipeLinkDraft {
  fromUrl(rawUrl: string): RecipeDraft | null {
    const sourceUrl = emptyToNullSource(rawUrl);
    if (!sourceUrl) {
      return null;
    }
    return {
      title: hostHint(sourceUrl),
      servings: null,
      ingredients: [],
      steps: [],
      sourceType: sourceTypeFrom(sourceUrl, null, "url"),
      sourceUrl,
      sourceText: null,
      notes: null,
      tags: [],
      emojis: [],
      ...emptyRecipeNutrition(),
    };
  }
}

function hostHint(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "") || "Recipe link";
  } catch {
    return "Recipe link";
  }
}
