import { describe, expect, it } from "vitest";
import { RecipeEmojiAssigner } from "@/domain/recipe/RecipeEmojiAssigner";

const assigner = new RecipeEmojiAssigner();

describe("RecipeEmojiAssigner", () => {
  it("suggests at most three relevant icons from the title and ingredients", () => {
    const emojis = assigner.suggest({
      title: "Spicy chicken noodle soup",
      notes: null,
      tags: [],
      ingredients: [
        { name: "chicken", quantity: "1", unit: null, note: null, parseFlagged: false },
        { name: "noodles", quantity: "1", unit: "pack", note: null, parseFlagged: false },
        { name: "chilli", quantity: "1", unit: "tsp", note: null, parseFlagged: false },
        { name: "garlic", quantity: "2", unit: "clove", note: null, parseFlagged: false },
      ],
    });
    expect(emojis.length).toBeLessThanOrEqual(3);
    expect(emojis).toContain("🍜");
    expect(emojis).toContain("🍗");
  });

  it("clamps to three unique palette icons", () => {
    expect(assigner.clamp(["🍜", "🍜", "not-an-icon", "🍗", "🍚", "🥗"])).toEqual(["🍜", "🍗", "🍚"]);
  });
});
