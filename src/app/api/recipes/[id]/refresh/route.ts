import { NextResponse } from "next/server";
import { createRecipeRepository, createRecipeSourceRefresher } from "@/lib/createImporter";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const repo = createRecipeRepository();
  const existing = await repo.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }

  const result = await createRecipeSourceRefresher().refresh(existing);
  if (result.kind === "unavailable") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  if (result.kind === "failed") {
    return NextResponse.json({ error: result.message, cost: result.cost }, { status: 422 });
  }

  const recipe = await repo.update(id, result.recipe);
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found." }, { status: 404 });
  }
  return NextResponse.json({ kind: "refreshed", recipe, cost: result.cost });
}
