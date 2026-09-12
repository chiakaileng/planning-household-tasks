import { NextResponse } from "next/server";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { createRecipeRepository } from "@/lib/createImporter";

export async function GET(request: Request) {
  const tag = new URL(request.url).searchParams.get("tag") ?? undefined;
  const recipes = await createRecipeRepository().list({ tag });
  return NextResponse.json({ recipes });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { draft?: RecipeDraft; confirmDuplicate?: boolean };
  if (!body.draft?.title || !body.draft.ingredients?.length) {
    return NextResponse.json({ error: "A title and at least one ingredient are required." }, { status: 400 });
  }

  const repo = createRecipeRepository();
  const duplicate = await repo.findDuplicate(body.draft);
  if (duplicate && !body.confirmDuplicate) {
    return NextResponse.json({
      kind: "duplicate",
      warning: `A recipe like this is already saved (“${duplicate.existingTitle}”). Save anyway if you want a second copy.`,
      existingId: duplicate.existingId,
    });
  }

  const saved = await repo.save(body.draft);
  return NextResponse.json({ kind: "saved", recipe: saved });
}
