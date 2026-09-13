import { describe, expect, it } from "vitest";
import { RecipeDishOpener } from "@/domain/plan/RecipeDishOpener";

const opener = new RecipeDishOpener();

describe("RecipeDishOpener", () => {
  it("opens only a live pool recipe", () => {
    expect(opener.canOpen({ contentType: "recipe", recipeId: "r1", recipeMissing: false })).toBe(true);
    expect(opener.canOpen({ contentType: "recipe", recipeId: "r1", recipeMissing: true })).toBe(false);
    expect(opener.canOpen({ contentType: "freeform", recipeId: null, recipeMissing: false })).toBe(false);
    expect(opener.canOpen({ contentType: "leftovers_text", recipeId: null, recipeMissing: false })).toBe(false);
  });
});
