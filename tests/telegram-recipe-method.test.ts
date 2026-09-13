import { describe, expect, it } from "vitest";
import { TelegramRecipeMethod } from "@/domain/telegram/TelegramRecipeMethod";

const method = new TelegramRecipeMethod(4096);

describe("TelegramRecipeMethod", () => {
  it("lists ingredients and numbered steps", () => {
    const chunks = method.chunks({
      title: "Tomato soup",
      sourceUrl: null,
      ingredients: [
        { name: "tomatoes", quantity: "2", unit: "cups", note: null, parseFlagged: false },
        { name: "onion", quantity: "1", unit: null, note: null, parseFlagged: false },
        { name: "salt", quantity: null, unit: null, note: null, parseFlagged: false },
      ],
      steps: ["Sweat the onion.", "Simmer the tomatoes."],
    });
    expect(chunks).toEqual([
      [
        "Tomato soup",
        "",
        "Ingredients",
        "• 2 cups tomatoes",
        "• 1 onion",
        "• salt",
        "",
        "Steps",
        "1. Sweat the onion.",
        "2. Simmer the tomatoes.",
      ].join("\n"),
    ]);
  });

  it("does not invent a method when the recipe is a link stub", () => {
    expect(
      method.chunks({
        title: "example.com",
        sourceUrl: "https://example.com/r",
        ingredients: [],
        steps: [],
      }),
    ).toEqual(['<a href="https://example.com/r">example.com</a>\n\nNo ingredients or steps saved.']);
  });

  it("splits a long method instead of truncating", () => {
    const short = new TelegramRecipeMethod(80);
    const chunks = short.chunks({
      title: "Stew",
      sourceUrl: null,
      ingredients: [{ name: "beef", quantity: "1", unit: "kg", note: null, parseFlagged: false }],
      steps: ["A".repeat(60)],
    });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toContain("beef");
    expect(chunks.join("")).toContain("A".repeat(60));
  });
});
