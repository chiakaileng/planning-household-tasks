import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";

/**
 * Applies a fresh extract onto a saved (or in-progress) recipe.
 * Incoming values replace only when the source stated them; household fields stay put.
 */
export class RecipeRefreshMerger {
  apply(current: RecipeDraft, incoming: RecipeDraft): RecipeDraft {
    return {
      ...current,
      servings: incoming.servings ?? current.servings,
      calories: incoming.calories ?? current.calories,
      protein: incoming.protein ?? current.protein,
      fat: incoming.fat ?? current.fat,
      carbohydrates: incoming.carbohydrates ?? current.carbohydrates,
      fibre: incoming.fibre ?? current.fibre,
    };
  }
}
