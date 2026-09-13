import { NextResponse } from "next/server";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { TagNormalizer } from "@/domain/recipe/TagNormalizer";
import { createRecipeRepository } from "@/lib/createImporter";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const recipe = await createRecipeRepository().getById(id);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }
  return NextResponse.json({ recipe });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    draft?: RecipeDraft;
    notes?: string | null;
    tags?: string[];
    emojis?: string[];
  };
  const repo = createRecipeRepository();
  if (body.draft) {
    if (!body.draft.title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    const duplicate = await repo.findDuplicate(body.draft, id);
    if (duplicate) {
      return NextResponse.json({
        kind: "duplicate",
        error: `Already in the pool (“${duplicate.existingTitle}”).`,
        existingId: duplicate.existingId,
        existingTitle: duplicate.existingTitle,
      });
    }
    try {
      const updated = await repo.update(id, body.draft);
      if (!updated) {
        return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
      }
      return NextResponse.json({ recipe: updated });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save." }, { status: 400 });
    }
  }

  const normalizer = new TagNormalizer();
  const updated = await repo.updateNotesAndTags(
    id,
    body.notes ?? null,
    normalizer.normalizeAll(body.tags ?? []),
    body.emojis ?? [],
  );
  if (!updated) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }
  return NextResponse.json({ recipe: updated });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const removed = await createRecipeRepository().remove(id);
  if (!removed) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }
  return NextResponse.json({ kind: "removed" });
}
