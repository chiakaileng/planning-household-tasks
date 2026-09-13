import type { DishDraft } from "@/domain/plan/DishDraft";
import { isDishContentType } from "@/domain/plan/DishContentType";

export function parseDishDraft(raw: Partial<DishDraft> | undefined): DishDraft | null {
  if (!raw || !isDishContentType(raw.contentType ?? "") || !raw.cookMemberId) {
    return null;
  }
  const eaterMemberIds = (raw.eaterMemberIds ?? []).filter((id) => id.trim().length > 0);
  if (eaterMemberIds.length === 0) {
    return null;
  }
  return {
    contentType: raw.contentType!,
    recipeId: raw.recipeId ?? null,
    sourceMealId: raw.sourceMealId ?? null,
    leftoverText: raw.leftoverText ?? null,
    freeformText: raw.freeformText ?? null,
    cookMemberId: raw.cookMemberId,
    eaterMemberIds,
  };
}
