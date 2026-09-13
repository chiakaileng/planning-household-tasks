import { describe, expect, it } from "vitest";
import { TagNormalizer } from "@/domain/recipe/TagNormalizer";

const normalizer = new TagNormalizer();

describe("TagNormalizer", () => {
  it("trims and lowercases so Child and child are the same", () => {
    expect(normalizer.normalize(" Child ")).toBe("child");
    expect(normalizer.normalizeAll(["Child", "child", " FAMILY "])).toEqual(["child", "family"]);
  });

  it("ignores empty or whitespace-only tags", () => {
    expect(normalizer.normalize("   ")).toBeNull();
    expect(normalizer.normalizeAll(["", "  ", "spicy"])).toEqual(["spicy"]);
  });

  it("splits comma-delimited tags and drops empty pieces", () => {
    expect(normalizer.normalizeAll(["child, family", " spicy,child,"])).toEqual(["child", "family", "spicy"]);
  });
});
