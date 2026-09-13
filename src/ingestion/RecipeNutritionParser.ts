import { emptyRecipeNutrition, type RecipeNutrition } from "@/domain/recipe/RecipeNutrition";

/**
 * Reads schema.org NutritionInformation, Energy/Mass objects, or raw numbers/strings.
 * Does not guess — missing or non-numeric values stay null.
 */
export class RecipeNutritionParser {
  parse(value: unknown): RecipeNutrition {
    const nutrition = emptyRecipeNutrition();
    if (value == null) {
      return nutrition;
    }
    if (typeof value !== "object") {
      return { ...nutrition, calories: this.parseCalories(value) };
    }
    const record = unwrapNutrition(value as Record<string, unknown>);
    return {
      calories: this.parseCalories(record.calories ?? record.calorie),
      protein: this.parseGrams(firstPresent(record, ["proteinContent", "protein", "proteinGrams"])),
      fat: this.parseGrams(firstPresent(record, ["fatContent", "fat", "fatGrams"])),
      carbohydrates: this.parseGrams(
        firstPresent(record, ["carbohydrateContent", "carbohydrates", "carbs", "carbohydrate"]),
      ),
      fibre: this.parseGrams(firstPresent(record, ["fiberContent", "fibreContent", "fiber", "fibre"])),
    };
  }

  parseCalories(value: unknown): number | null {
    return parseAmount(value, { allowZero: false, decimals: 0 });
  }

  parseGrams(value: unknown): number | null {
    return parseAmount(value, { allowZero: true, decimals: 1 });
  }
}

function unwrapNutrition(record: Record<string, unknown>): Record<string, unknown> {
  if (record.nutrition && typeof record.nutrition === "object" && !Array.isArray(record.nutrition)) {
    return record.nutrition as Record<string, unknown>;
  }
  return record;
}

function firstPresent(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] != null) {
      return record[key];
    }
  }
  return null;
}

function parseAmount(value: unknown, options: { allowZero: boolean; decimals: number }): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number") {
    return normalizeAmount(value, options);
  }
  if (typeof value === "string") {
    return normalizeAmount(numberFromText(value), options);
  }
  if (typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  return (
    parseAmount(record.value, options) ??
    parseAmount(record.calories, options) ??
    parseAmount(record.calorie, options)
  );
}

function numberFromText(text: string): number | null {
  const match = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

function normalizeAmount(amount: number | null, options: { allowZero: boolean; decimals: number }): number | null {
  if (amount == null || !Number.isFinite(amount)) {
    return null;
  }
  if (amount < 0 || (!options.allowZero && amount === 0)) {
    return null;
  }
  const factor = 10 ** options.decimals;
  return Math.round(amount * factor) / factor;
}
