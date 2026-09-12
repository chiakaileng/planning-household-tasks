import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { IngredientLineParser } from "@/ingestion/IngredientLineParser";

const parser = new IngredientLineParser();

describe("IngredientLineParser", () => {
  it("parses common quantity + unit + name lines", () => {
    expect(parser.parse("2 cups flour")).toMatchObject({
      quantity: "2",
      unit: "cups",
      name: "flour",
      parseFlagged: false,
    });
    expect(parser.parse("1/2 tsp salt")).toMatchObject({
      quantity: "1/2",
      unit: "tsp",
      name: "salt",
      parseFlagged: false,
    });
    expect(parser.parse("3 large eggs")).toMatchObject({
      quantity: "3",
      unit: "large",
      name: "eggs",
      parseFlagged: false,
    });
  });

  it("keeps oil alternatives in the name instead of dropping them", () => {
    const oil = parser.parse("2 tbsp oil (can be sesame oil, avocado oil, olive oil etc.)");
    expect(oil.quantity).toBe("2");
    expect(oil.unit).toBe("tbsp");
    expect(oil.name).toContain("sesame oil");
    expect(oil.name).toContain("avocado oil");
    expect(oil.name).toContain("olive oil");
    expect(oil.parseFlagged).toBe(false);
  });

  it("flags unparseable lines instead of dropping or guessing", () => {
    const flagged = parser.parse("a splash of olive oil");
    expect(flagged.parseFlagged).toBe(true);
    expect(flagged.name).toBe("a splash of olive oil");
    expect(flagged.quantity).toBeNull();
  });
});

describe("paste fixture", () => {
  it("is available for fallback tests", () => {
    const text = readFileSync(path.join(__dirname, "fixtures/pasted-recipe.txt"), "utf8");
    expect(text).toMatch(/rice/i);
  });
});
