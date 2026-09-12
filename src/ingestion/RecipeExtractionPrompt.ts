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
  ingredients: string[];
  steps: string[];
};
