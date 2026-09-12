import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import type { SourceType } from "@/domain/recipe/SourceType";
import { IngredientLineParser } from "@/ingestion/IngredientLineParser";
import type { ExtractedRecipePayload, IRecipeExtractor } from "@/ingestion/IRecipeExtractor";
import type { ILlmClient } from "@/ingestion/ILlmClient";
import { RecipeExtractionPrompt, type LlmRecipeJson } from "@/ingestion/RecipeExtractionPrompt";

export class LlmRecipeExtractor implements IRecipeExtractor {
  constructor(
    private readonly llm: ILlmClient,
    private readonly prompt: RecipeExtractionPrompt,
    private readonly ingredientParser: IngredientLineParser,
  ) {}

  async extract(
    text: string,
    source: { sourceType: SourceType; sourceUrl: string | null },
  ): Promise<ExtractedRecipePayload | null> {
    const result = await this.llm.completeJson<LlmRecipeJson>({
      prompt: this.prompt.build(text),
      responseSchema: this.prompt.responseSchema(),
    });

    if (!result.ok) {
      return null;
    }

    const payload = result.value;
    if (!payload.isRecipe || !payload.title?.trim() || !payload.ingredients?.length) {
      return null;
    }

    const draft: RecipeDraft = {
      title: payload.title.trim(),
      servings: typeof payload.servings === "number" ? payload.servings : null,
      ingredients: this.ingredientParser.parseAll(payload.ingredients),
      steps: (payload.steps ?? []).map((step) => step.trim()).filter(Boolean),
      sourceType: source.sourceType,
      sourceUrl: source.sourceUrl,
      sourceText: text,
      notes: null,
      tags: [],
    };

    return {
      draft,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  }
}
