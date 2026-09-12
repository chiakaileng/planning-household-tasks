import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";

export interface IJsonLdRecipeParser {
  /**
   * Returns a draft when a complete schema.org Recipe is present.
   * Returns null when JSON-LD is missing or required fields are absent (caller falls back to Phase 1b).
   */
  parse(html: string, sourceUrl: string): RecipeDraft | null;
}
