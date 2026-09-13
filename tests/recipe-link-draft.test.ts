import { describe, expect, it } from "vitest";
import { RecipeLinkDraft } from "@/domain/recipe/RecipeLinkDraft";

const links = new RecipeLinkDraft();

describe("RecipeLinkDraft", () => {
  it("keeps the URL and a host title when extract is skipped", () => {
    const draft = links.fromUrl("https://www.example.test/pasta");
    expect(draft).toMatchObject({
      title: "example.test",
      sourceType: "url",
      sourceUrl: "https://www.example.test/pasta",
      ingredients: [],
      steps: [],
    });
  });

  it("ignores a blank URL", () => {
    expect(links.fromUrl("   ")).toBeNull();
  });
});
