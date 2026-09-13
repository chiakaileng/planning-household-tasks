import type { DishContentType } from "@/domain/plan/DishContentType";

export type DishDraft = {
  contentType: DishContentType;
  recipeId: string | null;
  sourceMealId: string | null;
  sourceDishId: string | null;
  leftoverText: string | null;
  freeformText: string | null;
  freeformTitle?: string | null;
  cookMemberId: string;
  eaterMemberIds: string[];
};
