import { NextResponse } from "next/server";
import { parseDishDraft } from "@/app/api/week/parseDishDraft";
import type { DishDraft } from "@/domain/plan/DishDraft";
import { createWeekMealPlanner } from "@/lib/createImporter";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { mealId?: string; draft?: Partial<DishDraft> };
  const draft = parseDishDraft(body.draft);
  if (!draft) {
    return NextResponse.json({ error: "Say what the dish is." }, { status: 400 });
  }
  try {
    const dish = await createWeekMealPlanner().updateDish(id, draft, body.mealId);
    if (!dish) {
      return NextResponse.json({ error: "That dish is not on the week." }, { status: 404 });
    }
    return NextResponse.json({ kind: "saved", dish });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update that dish." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const removed = await createWeekMealPlanner().removeDish(id);
  if (!removed) {
    return NextResponse.json({ error: "That dish is not on the week." }, { status: 404 });
  }
  return NextResponse.json({ kind: "removed" });
}
