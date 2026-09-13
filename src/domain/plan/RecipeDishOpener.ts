/**
 * Only a live pool recipe opens the cook card. Leftovers, free-form, and a deleted recipe stay labels.
 */
export class RecipeDishOpener {
  canOpen(dish: { contentType: string; recipeId: string | null; recipeMissing: boolean }): boolean {
    return dish.contentType === "recipe" && Boolean(dish.recipeId) && !dish.recipeMissing;
  }
}
