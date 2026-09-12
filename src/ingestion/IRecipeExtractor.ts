import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import type { SourceType } from "@/domain/recipe/SourceType";

export type ExtractedRecipePayload = {
  draft: RecipeDraft;
  inputTokens: number;
  outputTokens: number;
};

export interface IRecipeExtractor {
  extract(text: string, source: { sourceType: SourceType; sourceUrl: string | null }): Promise<ExtractedRecipePayload | null>;
}
