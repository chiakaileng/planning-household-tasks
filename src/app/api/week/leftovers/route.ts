import { NextResponse } from "next/server";
import { createWeekMealPlanner } from "@/lib/createImporter";

export async function GET() {
  const sources = await createWeekMealPlanner().leftoverSources();
  return NextResponse.json({ sources });
}
