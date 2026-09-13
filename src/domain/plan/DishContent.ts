import type { DishContentType } from "@/domain/plan/DishContentType";

export type DishContentInput = {
  contentType: DishContentType;
  recipeId: string | null;
  sourceMealId: string | null;
  leftoverText: string | null;
  freeformText: string | null;
};

/**
 * Titles and required fields for each content type. Pages do not invent leftover wording.
 */
export class DishContent {
  title(
    input: DishContentInput,
    extras: { recipeTitle?: string | null; sourceMealLabel?: string | null },
  ): string {
    if (input.contentType === "recipe") {
      return extras.recipeTitle?.trim() || "Recipe";
    }
    if (input.contentType === "leftovers_meal") {
      return extras.sourceMealLabel?.trim() || "Leftovers";
    }
    if (input.contentType === "leftovers_text") {
      return trimOrEmpty(input.leftoverText);
    }
    return trimOrEmpty(input.freeformText);
  }

  leftoverMealLabel(mealName: string, mealDate: string): string {
    return `Leftovers: ${mealName} · ${mealDate}`;
  }

  validate(input: DishContentInput): string | null {
    if (input.contentType === "recipe" && !input.recipeId) {
      return "Pick a recipe from the pool.";
    }
    if (input.contentType === "leftovers_meal" && !input.sourceMealId) {
      return "Pick which meal these leftovers are from.";
    }
    if (input.contentType === "leftovers_text" && !trimOrEmpty(input.leftoverText)) {
      return "Write what the leftovers are.";
    }
    if (input.contentType === "freeform" && !trimOrEmpty(input.freeformText)) {
      return "Write the meal (takeaway, freezer, …).";
    }
    return null;
  }
}

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? "";
}
