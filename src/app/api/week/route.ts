import { NextResponse } from "next/server";
import { createWeekMealPlanner } from "@/lib/createImporter";

export async function GET(request: Request) {
  const start = new URL(request.url).searchParams.get("start");
  const planner = createWeekMealPlanner();
  const week = await planner.loadWeek(start);
  return NextResponse.json({
    weekStart: week.weekStart,
    days: week.days,
    today: week.today,
    meals: week.meals,
    defaultSlots: planner.defaultSlots(),
  });
}
