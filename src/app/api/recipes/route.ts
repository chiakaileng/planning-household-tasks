import { NextResponse } from "next/server";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { createRecipeRepository } from "@/lib/createImporter";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tag = params.get("tag") ?? undefined;
  const q = params.get("q") ?? undefined;
  const recipes = await createRecipeRepository().list({ tag, q });
  return NextResponse.json({ recipes });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { draft?: RecipeDraft; checkOnly?: boolean };
  if (!body.draft?.title || !body.draft.ingredients?.length) {
    return NextResponse.json({ error: "A title and at least one ingredient are required." }, { status: 400 });
  }

  const repo = createRecipeRepository();
  const duplicate = await repo.findDuplicate(body.draft);
  if (duplicate) {
    return NextResponse.json({
      kind: "duplicate",
      warning: `Already in the pool (“${duplicate.existingTitle}”).`,
      existingId: duplicate.existingId,
      existingTitle: duplicate.existingTitle,
    });
  }
  if (body.checkOnly) {
    return NextResponse.json({ kind: "ok" });
  }

  try {
    const saved = await repo.save(body.draft);
    return NextResponse.json({ kind: "saved", recipe: saved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the recipe." },
      { status: 500 },
    );
  }
}
