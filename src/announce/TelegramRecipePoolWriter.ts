import { RecipeLinkDraft } from "@/domain/recipe/RecipeLinkDraft";
import { RecipePasteDraft } from "@/domain/recipe/RecipePasteDraft";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";
import type { RecipeImporter } from "@/ingestion/RecipeImporter";
import type { IRecipeRepository } from "@/persistence/IRecipeRepository";

export interface ITelegramRecipePoolWriter {
  addFromUrl(url: string): Promise<PoolWriteResult>;
  addFromPaste(title: string, text: string): Promise<PoolWriteResult>;
}

export type PoolWriteResult =
  | { kind: "added"; recipe: SavedRecipe }
  | { kind: "already"; recipe: SavedRecipe }
  | { kind: "link"; recipe: SavedRecipe }
  | { kind: "failed"; message: string };

/**
 * Same import pipeline as the website, then save (or save-as-link) without a
 * confirm screen — the person already typed /add.
 */
export class TelegramRecipePoolWriter implements ITelegramRecipePoolWriter {
  private readonly links = new RecipeLinkDraft();
  private readonly pastes = new RecipePasteDraft();

  constructor(
    private readonly importer: RecipeImporter,
    private readonly recipes: IRecipeRepository,
  ) {}

  async addFromPaste(title: string, text: string): Promise<PoolWriteResult> {
    const draft = this.pastes.fromTitleAndText(title, text);
    if (!draft) {
      return { kind: "failed", message: "Need a title and the recipe text to save it to the library." };
    }
    return this.saveOrExisting(draft, "added");
  }

  async addFromUrl(url: string): Promise<PoolWriteResult> {
    const imported = await this.importer.importFromUrl(url);
    if (imported.kind === "ready") {
      return this.saveOrExisting(imported.recipe, "added");
    }
    const stub = this.links.fromUrl(url);
    if (!stub) {
      return { kind: "failed", message: imported.kind === "fetch_failed" ? imported.message : "Please paste a full http(s) URL." };
    }
    return this.saveOrExisting(stub, "link");
  }

  private async saveOrExisting(
    draft: Parameters<IRecipeRepository["save"]>[0],
    savedKind: "added" | "link",
  ): Promise<PoolWriteResult> {
    const duplicate = await this.recipes.findDuplicate(draft);
    if (duplicate) {
      const existing = await this.recipes.getById(duplicate.existingId);
      if (existing) {
        return { kind: "already", recipe: existing };
      }
    }
    const recipe = await this.recipes.save(draft);
    return { kind: savedKind, recipe };
  }
}
