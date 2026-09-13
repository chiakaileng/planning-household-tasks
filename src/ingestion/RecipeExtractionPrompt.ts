/**
 * Isolated so Phase 2 generation can reuse the same “Recipe-shaped JSON” contract
 * without copying prompt text out of the importer.
 */
export class RecipeExtractionPrompt {
  build(rawText: string): string {
    return [
      "Extract a cooking recipe from the user's text.",
      "If the text is not a recipe (for example an advertisement or shopping list with no method), set isRecipe to false.",
      "If it is a recipe, set isRecipe to true and fill title, ingredients (one raw line each), steps, and servings when known.",
      "If the text states calories/kcal or grams of protein, fat, carbohydrates, or fibre/fiber, copy those numbers. If a value is not stated, set that field to null. Do not invent nutrition.",
      "Copy each ingredient line in full. Keep parenthetical notes and substitutions, e.g. keep “2 tbsp oil (can be sesame oil, avocado oil, olive oil etc.)” — do not shorten it to “2 tbsp oil”.",
      "Do not invent ingredients or steps that are not implied by the text.",
      "",
      "TEXT:",
      rawText,
    ].join("\n");
  }

  responseSchema(): unknown {
    return {
      type: "OBJECT",
      properties: {
        isRecipe: { type: "BOOLEAN" },
        title: { type: "STRING" },
        servings: { type: "INTEGER", nullable: true },
        calories: { type: "INTEGER", nullable: true },
        protein: { type: "NUMBER", nullable: true },
        fat: { type: "NUMBER", nullable: true },
        carbohydrates: { type: "NUMBER", nullable: true },
        fibre: { type: "NUMBER", nullable: true },
        ingredients: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
        steps: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
      },
      required: ["isRecipe", "title", "ingredients", "steps"],
    };
  }
}

export type LlmRecipeJson = {
  isRecipe: boolean;
  title: string;
  servings?: number | null;
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbohydrates?: number | null;
  fibre?: number | null;
  ingredients: string[];
  steps: string[];
};
