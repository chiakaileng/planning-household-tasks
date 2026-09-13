import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";

/**
 * Pool search for the week tab: name, notes, tags, ingredients, and steps.
 * Empty query means “no text filter.”
 */
export class RecipeSearch {
  matches(recipe: SavedRecipe, rawQuery: string): boolean {
    const query = rawQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }
    const haystack = [
      recipe.title,
      recipe.notes ?? "",
      ...recipe.tags,
      ...recipe.ingredients.map((ingredient) =>
        [ingredient.quantity, ingredient.unit, ingredient.name, ingredient.note].filter(Boolean).join(" "),
      ),
      ...recipe.steps,
    ]
      .join("\n")
      .toLowerCase();
    return haystack.includes(query);
  }

  filter(recipes: readonly SavedRecipe[], rawQuery: string): SavedRecipe[] {
    return recipes.filter((recipe) => this.matches(recipe, rawQuery));
  }
}
