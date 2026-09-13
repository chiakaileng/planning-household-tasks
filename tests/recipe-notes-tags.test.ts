import { afterAll, describe, expect, it } from "vitest";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { emptyRecipeNutrition } from "@/domain/recipe/RecipeNutrition";
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
    emojis: [],
    ...emptyRecipeNutrition(),
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

    const rewritten = await repo.update(saved.id, {
      ...saved,
      title: "Updated stir fry",
      steps: ["Heat the pan.", "Add sauce."],
    });
    expect(rewritten?.title).toBe("Updated stir fry");
    expect(rewritten?.steps).toEqual(["Heat the pan.", "Add sauce."]);
  });

  it("saves with empty notes and tags", async () => {
    const saved = await repo.save(draft({ notes: null, tags: [] }));
    createdIds.push(saved.id);
    expect(saved.notes).toBeNull();
    expect(saved.tags).toEqual([]);
  });

  it("flags the same URL or pasted text as already in the pool", async () => {
    const urlDraft = draft({
      sourceUrl: `https://example.test/same-${Date.now()}`,
      sourceText: null,
    });
    const saved = await repo.save(urlDraft);
    createdIds.push(saved.id);

    const byUrl = await repo.findDuplicate({ ...urlDraft, title: "Another title" });
    expect(byUrl).toEqual({ kind: "url", existingId: saved.id, existingTitle: saved.title });

    const text = `same-paste-${Date.now()}`;
    const pasted = await repo.save(draft({ sourceUrl: null, sourceText: text }));
    createdIds.push(pasted.id);
    const byText = await repo.findDuplicate(draft({ sourceUrl: null, sourceText: `  ${text}  ` }));
    expect(byText?.existingId).toBe(pasted.id);
  });

  it("updates source and can delete a recipe", async () => {
    const saved = await repo.save(draft({ sourceUrl: null, sourceText: `delete-me-${Date.now()}` }));
    createdIds.push(saved.id);

    const moved = await repo.update(saved.id, {
      ...saved,
      sourceUrl: `https://example.test/moved-${saved.id}`,
      sourceText: null,
    });
    expect(moved?.sourceType).toBe("url");
    expect(moved?.sourceUrl).toContain("moved-");

    const sameSource = await repo.findDuplicate(
      draft({ sourceUrl: moved?.sourceUrl ?? "", sourceText: null }),
      saved.id,
    );
    expect(sameSource).toBeNull();

    const removed = await repo.remove(saved.id);
    expect(removed).toBe(true);
    expect(await repo.getById(saved.id)).toBeNull();
  });

  it("persists nutrition when the draft has it", async () => {
    const saved = await repo.save(
      draft({ calories: 480, protein: 32, fat: 18, carbohydrates: 22.5, fibre: 4 }),
    );
    createdIds.push(saved.id);
    expect(saved).toMatchObject({
      calories: 480,
      protein: 32,
      fat: 18,
      carbohydrates: 22.5,
      fibre: 4,
    });

    const updated = await repo.update(saved.id, { ...saved, calories: 510, protein: 34 });
    expect(updated?.calories).toBe(510);
    expect(updated?.protein).toBe(34);
  });
});
