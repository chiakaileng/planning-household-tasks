import type { DishDraft } from "@/domain/plan/DishDraft";
import { isDishContentType } from "@/domain/plan/DishContentType";

export function parseDishDraft(raw: Partial<DishDraft> | undefined): DishDraft | null {
  if (!raw || !isDishContentType(raw.contentType ?? "")) {
    return null;
  }
  return {
    contentType: raw.contentType!,
    recipeId: raw.recipeId ?? null,
    sourceMealId: raw.sourceMealId ?? null,
    sourceDishId: raw.sourceDishId ?? null,
    leftoverText: raw.leftoverText ?? null,
    freeformText: raw.freeformText ?? null,
    freeformTitle: raw.freeformTitle?.trim() || null,
    cookMemberId: raw.cookMemberId?.trim() || "",
    eaterMemberIds: (raw.eaterMemberIds ?? []).filter((id) => id.trim().length > 0),
  };
}
