import { WeekBoard } from "@/app/WeekBoard";
import { createMemberRepository, createRecipeRepository, createWeekMealPlanner } from "@/lib/createImporter";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  const planner = createWeekMealPlanner();
  const week = await planner.loadWeek(start ?? null);
  const [members, recipes, leftovers] = await Promise.all([
    createMemberRepository().list(),
    createRecipeRepository().list(),
    planner.leftoverSources(),
  ]);

  return (
    <>
      <header className="content-header">
        <h1 className="page-title">This week</h1>
        <p className="lede">Fill a meal when you know it. Empty cells are fine.</p>
      </header>
      <WeekBoard
        initialWeekStart={week.weekStart}
        initialDays={week.days}
        initialToday={week.today}
        initialMeals={week.meals}
        initialMembers={members}
        initialRecipes={recipes}
        initialLeftovers={leftovers}
        defaultSlots={planner.defaultSlots()}
      />
    </>
  );
}
