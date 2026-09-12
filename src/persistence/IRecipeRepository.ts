import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";

export type DuplicateWarning = {
  kind: "url" | "text";
  existingId: string;
  existingTitle: string;
};

export type RecipeListQuery = {
  tag?: string;
};

export interface IRecipeRepository {
  save(draft: RecipeDraft): Promise<SavedRecipe>;
  findDuplicate(draft: RecipeDraft): Promise<DuplicateWarning | null>;
  list(query?: RecipeListQuery): Promise<SavedRecipe[]>;
  getById(id: string): Promise<SavedRecipe | null>;
  updateNotesAndTags(id: string, notes: string | null, tags: string[]): Promise<SavedRecipe | null>;
}
