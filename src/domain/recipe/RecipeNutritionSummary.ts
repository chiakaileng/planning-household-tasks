import type { RecipeNutrition } from "@/domain/recipe/RecipeNutrition";

/**
 * Compact line for tiles and captions. Skips fields the recipe does not have.
 */
export class RecipeNutritionSummary {
  format(nutrition: RecipeNutrition): string {
    const parts: string[] = [];
    if (nutrition.calories != null) {
      parts.push(`${nutrition.calories} kcal`);
    }
    if (nutrition.protein != null) {
      parts.push(`${formatGrams(nutrition.protein)} protein`);
    }
    if (nutrition.fat != null) {
      parts.push(`${formatGrams(nutrition.fat)} fat`);
    }
    if (nutrition.carbohydrates != null) {
      parts.push(`${formatGrams(nutrition.carbohydrates)} carbs`);
    }
    if (nutrition.fibre != null) {
      parts.push(`${formatGrams(nutrition.fibre)} fibre`);
    }
    return parts.join(" · ");
  }
}

function formatGrams(grams: number): string {
  const rounded = Math.round(grams * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}g`;
}
