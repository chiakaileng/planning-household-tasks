import { NextResponse } from "next/server";
import { parseDishDraft } from "@/app/api/week/parseDishDraft";
import type { DishDraft } from "@/domain/plan/DishDraft";
import { createWeekMealPlanner } from "@/lib/createImporter";

export async function POST(request: Request) {
  const body = (await request.json()) as { mealId?: string; draft?: Partial<DishDraft> };
  const draft = parseDishDraft(body.draft);
  if (!body.mealId || !draft) {
    return NextResponse.json(
      { error: "Pick a meal, at least one eater, and who cooks." },
      { status: 400 },
    );
  }
  try {
    const dish = await createWeekMealPlanner().addDish(body.mealId, draft);
    return NextResponse.json({ kind: "saved", dish });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add that dish." }, { status: 400 });
  }
}
