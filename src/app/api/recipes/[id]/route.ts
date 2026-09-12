import { NextResponse } from "next/server";
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
  const body = (await request.json()) as { notes?: string | null; tags?: string[] };
  const normalizer = new TagNormalizer();
  const updated = await createRecipeRepository().updateNotesAndTags(
    id,
    body.notes ?? null,
    normalizer.normalizeAll(body.tags ?? []),
  );
  if (!updated) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }
  return NextResponse.json({ recipe: updated });
}
