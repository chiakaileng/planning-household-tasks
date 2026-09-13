import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";

export type DuplicateWarning = {
  kind: "url" | "text";
  existingId: string;
  existingTitle: string;
};

export type RecipeListQuery = {
  tag?: string;
  q?: string;
};

export interface IRecipeRepository {
  save(draft: RecipeDraft): Promise<SavedRecipe>;
  findDuplicate(draft: RecipeDraft, excludeId?: string): Promise<DuplicateWarning | null>;
  list(query?: RecipeListQuery): Promise<SavedRecipe[]>;
  getById(id: string): Promise<SavedRecipe | null>;
  updateNotesAndTags(id: string, notes: string | null, tags: string[], emojis?: string[]): Promise<SavedRecipe | null>;
  update(id: string, draft: RecipeDraft): Promise<SavedRecipe | null>;
  remove(id: string): Promise<boolean>;
}
