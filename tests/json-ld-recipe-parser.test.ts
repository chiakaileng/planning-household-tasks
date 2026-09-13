import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { IngredientLineParser } from "@/ingestion/IngredientLineParser";
import { JsonLdRecipeParser } from "@/ingestion/JsonLdRecipeParser";

const parser = new JsonLdRecipeParser(new IngredientLineParser());

describe("JsonLdRecipeParser", () => {
  it("maps a real-shaped Recipe JSON-LD fixture into our schema", () => {
    const html = readFileSync(path.join(__dirname, "fixtures/recipe-with-jsonld.html"), "utf8");
    const draft = parser.parse(html, "https://example.test/pasta");

    expect(draft).not.toBeNull();
    expect(draft?.title).toBe("Weeknight Tomato Pasta");
    expect(draft?.sourceType).toBe("url");
    expect(draft?.sourceUrl).toBe("https://example.test/pasta");
    expect(draft?.servings).toBe(4);
    expect(draft?.calories).toBe(420);
    expect(draft?.protein).toBe(18);
    expect(draft?.fat).toBe(12);
    expect(draft?.carbohydrates).toBe(45);
    expect(draft?.fibre).toBe(6);
    expect(draft?.steps).toHaveLength(2);
    expect(draft?.ingredients.some((item) => item.parseFlagged)).toBe(true);
    expect(draft?.ingredients.find((item) => item.name === "flour")).toMatchObject({
      quantity: "2",
      unit: "cups",
    });
    expect(draft?.notes).toBeNull();
    expect(draft?.tags).toEqual([]);
  });

  it("returns null when JSON-LD is missing so the importer can fall back", () => {
    const html = readFileSync(path.join(__dirname, "fixtures/page-without-jsonld.html"), "utf8");
    expect(parser.parse(html, "https://example.test/notes")).toBeNull();
  });

  it("returns null when JSON-LD Recipe has no ingredients", () => {
    const html = `<script type="application/ld+json">{"@type":"Recipe","name":"Empty"}</script>`;
    expect(parser.parse(html, "https://example.test/empty")).toBeNull();
  });
});
