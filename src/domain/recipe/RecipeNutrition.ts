/**
 * Nutrition the source stated. Any field may be null — never invent a value.
 * Calories are kcal; protein, fat, carbohydrates, and fibre are grams.
 */
export type RecipeNutrition = {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrates: number | null;
  fibre: number | null;
};

export function emptyRecipeNutrition(): RecipeNutrition {
  return {
    calories: null,
    protein: null,
    fat: null,
    carbohydrates: null,
    fibre: null,
  };
}
