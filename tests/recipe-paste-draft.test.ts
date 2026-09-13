import { describe, expect, it } from "vitest";
import { RecipePasteDraft } from "@/domain/recipe/RecipePasteDraft";

describe("RecipePasteDraft", () => {
  const pastes = new RecipePasteDraft();

  it("keeps the title and paste and skips empty input", () => {
    expect(pastes.fromTitleAndText("  ", "1 cup flour")).toBeNull();
    const draft = pastes.fromTitleAndText("Friday pizza", "1 cup flour\n2 eggs");
    expect(draft?.title).toBe("Friday pizza");
    expect(draft?.sourceType).toBe("pasted");
    expect(draft?.sourceText).toBe("1 cup flour\n2 eggs");
    expect(draft?.steps).toEqual(["1 cup flour\n2 eggs"]);
  });
});
