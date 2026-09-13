import type { Ingredient } from "@/domain/recipe/Ingredient";
import { TelegramHtmlText } from "@/domain/plan/TelegramHtmlText";

export type RecipeMethodSource = {
  title: string;
  sourceUrl: string | null;
  ingredients: readonly Ingredient[];
  steps: readonly string[];
};

/**
 * On-demand cook card for Telegram. Announce messages never use this builder.
 */
export class TelegramRecipeMethod {
  private readonly html = new TelegramHtmlText();

  constructor(private readonly maxChars: number) {}

  chunks(recipe: RecipeMethodSource): string[] {
    const heading = this.html.recipeTitle(recipe.title, recipe.sourceUrl);
    if (recipe.ingredients.length === 0 && recipe.steps.length === 0) {
      return [`${heading}\n\nNo ingredients or steps saved.`];
    }
    const ingredients = [
      "Ingredients",
      ...recipe.ingredients.map((ingredient) => `• ${this.html.escape(ingredientLine(ingredient))}`),
    ].join("\n");
    const steps =
      recipe.steps.length === 0
        ? ""
        : ["Steps", ...recipe.steps.map((step, index) => `${index + 1}. ${this.html.escape(step)}`)].join("\n");
    const full = steps ? `${heading}\n\n${ingredients}\n\n${steps}` : `${heading}\n\n${ingredients}`;
    if (full.length <= this.maxChars) {
      return [full];
    }
    const first = `${heading}\n\n${ingredients}`;
    const rest = steps || "";
    return this.splitFitted([first, rest].filter(Boolean));
  }

  private splitFitted(parts: string[]): string[] {
    const chunks: string[] = [];
    for (const part of parts) {
      if (part.length <= this.maxChars) {
        chunks.push(part);
        continue;
      }
      let remaining = part;
      while (remaining.length > this.maxChars) {
        chunks.push(remaining.slice(0, this.maxChars));
        remaining = remaining.slice(this.maxChars);
      }
      if (remaining) {
        chunks.push(remaining);
      }
    }
    return chunks;
  }
}

function ingredientLine(ingredient: Ingredient): string {
  return [ingredient.quantity, ingredient.unit, ingredient.name, ingredient.note].filter(Boolean).join(" ");
}
