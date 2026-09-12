import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";

export type SavedRecipe = RecipeDraft & {
  id: string;
};
