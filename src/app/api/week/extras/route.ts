import { NextResponse } from "next/server";
import { createWeekMealPlanner } from "@/lib/createImporter";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    insertAfterSlotKey?: string;
    weekStart?: string;
    recurs?: boolean;
  };
  const name = body.name?.trim() ?? "";
  if (!name || !body.insertAfterSlotKey || !body.weekStart) {
    return NextResponse.json({ error: "Name the extra meal and where it sits." }, { status: 400 });
  }
  try {
    const planner = createWeekMealPlanner();
    const template = await planner.addExtraMeal({
      name,
      insertAfterSlotKey: body.insertAfterSlotKey,
      weekStart: body.weekStart,
      recurs: Boolean(body.recurs),
    });
    const week = await planner.loadWeek(body.weekStart);
    return NextResponse.json({ kind: "saved", template, meals: week.meals, weekStart: week.weekStart });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not add that meal." }, { status: 400 });
  }
}
