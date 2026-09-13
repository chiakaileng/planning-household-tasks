import { describe, expect, it } from "vitest";
import { sourceTypeFrom } from "@/domain/recipe/RecipeSource";

describe("sourceTypeFrom", () => {
  it("prefers a URL, then paste", () => {
    expect(sourceTypeFrom("https://example.test/a", "ignored", "pasted")).toBe("url");
    expect(sourceTypeFrom(null, "1 cup rice", "url")).toBe("pasted");
    expect(sourceTypeFrom(null, null, "generated")).toBe("generated");
  });
});
