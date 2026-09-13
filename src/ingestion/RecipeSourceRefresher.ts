import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { RecipeRefreshMerger } from "@/domain/recipe/RecipeRefreshMerger";
import { recipeHasRefreshSource } from "@/domain/recipe/RecipeRefreshSource";
import type { ExtractFromPasteResult, ImportFromUrlResult, LlmCostSnapshot } from "@/ingestion/ImportResults";
import type { RecipeImporter } from "@/ingestion/RecipeImporter";

export type RefreshFromSourceResult =
  | {
      kind: "ready";
      recipe: RecipeDraft;
      cost: LlmCostSnapshot | null;
    }
  | {
      kind: "unavailable";
      message: string;
    }
  | {
      kind: "failed";
      message: string;
      cost: LlmCostSnapshot | null;
    };

/**
 * Re-runs URL or paste ingest, then merges stated nutrition/servings into the current recipe.
 */
export class RecipeSourceRefresher {
  constructor(
    private readonly importer: RecipeImporter,
    private readonly merger = new RecipeRefreshMerger(),
  ) {}

  async refresh(current: RecipeDraft): Promise<RefreshFromSourceResult> {
    if (!recipeHasRefreshSource(current)) {
      return {
        kind: "unavailable",
        message: "This recipe has no URL or original text to refresh from.",
      };
    }

    const pulled = current.sourceUrl?.trim()
      ? await this.importer.importFromUrl(current.sourceUrl)
      : await this.importer.extractFromPastedText(current.sourceText ?? "");

    if (!isReady(pulled)) {
      return {
        kind: "failed",
        message: pulled.message,
        cost: "cost" in pulled ? pulled.cost : null,
      };
    }

    return {
      kind: "ready",
      recipe: this.merger.apply(current, pulled.recipe),
      cost: pulled.cost,
    };
  }
}

function isReady(
  result: ImportFromUrlResult | ExtractFromPasteResult,
): result is Extract<ImportFromUrlResult | ExtractFromPasteResult, { kind: "ready" }> {
  return result.kind === "ready";
}
