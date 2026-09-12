import { afterAll, describe, expect, it } from "vitest";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { prisma } from "@/persistence/prisma";
import { RecipeRepository } from "@/persistence/RecipeRepository";

function draft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    title: "Test stir fry",
    servings: 2,
    ingredients: [{ name: "oil", quantity: "2", unit: "tbsp", note: null, parseFlagged: false }],
    steps: ["Heat the pan."],
    sourceType: "pasted",
    sourceUrl: null,
    sourceText: `notes-tags-test-${Date.now()}-${Math.random()}`,
    notes: "kid likes extra sauce",
    tags: ["Child", " child ", "family"],
    ...overrides,
  };
}

describe("RecipeRepository notes and tags", () => {
  const repo = new RecipeRepository(prisma);
  const createdIds: string[] = [];

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.recipe.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.$disconnect();
  });

  it("persists notes and normalizes duplicate tags, and can filter by tag", async () => {
    const saved = await repo.save(draft());
    createdIds.push(saved.id);

    expect(saved.notes).toBe("kid likes extra sauce");
    expect(saved.tags).toEqual(["child", "family"]);

    const childOnly = await repo.list({ tag: "CHILD" });
    expect(childOnly.some((recipe) => recipe.id === saved.id)).toBe(true);

    const missing = await repo.list({ tag: "spicy" });
    expect(missing.some((recipe) => recipe.id === saved.id)).toBe(false);

    const updated = await repo.updateNotesAndTags(saved.id, "half the chilli", ["Parents", "parents"]);
    expect(updated?.notes).toBe("half the chilli");
    expect(updated?.tags).toEqual(["parents"]);
  });

  it("saves with empty notes and tags", async () => {
    const saved = await repo.save(draft({ notes: null, tags: [] }));
    createdIds.push(saved.id);
    expect(saved.notes).toBeNull();
    expect(saved.tags).toEqual([]);
  });
});
