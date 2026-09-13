import { describe, expect, it } from "vitest";
import { RecipeTagFilter } from "@/domain/recipe/RecipeTagFilter";

const filter = new RecipeTagFilter();

describe("RecipeTagFilter", () => {
  it("toggles a tag without dropping the others", () => {
    const withChild = filter.toggle([], "Child");
    const withBoth = filter.toggle(withChild, "family");
    expect(withBoth).toEqual(["child", "family"]);
    expect(filter.toggle(withBoth, "child")).toEqual(["family"]);
  });

  it("keeps every recipe visible when no tag is selected", () => {
    expect(filter.matches(["child"], [])).toBe(true);
  });

  it("matches a recipe that has any selected tag", () => {
    expect(filter.matches(["child", "spicy"], ["family", "spicy"])).toBe(true);
    expect(filter.matches(["child"], ["family"])).toBe(false);
  });
});
