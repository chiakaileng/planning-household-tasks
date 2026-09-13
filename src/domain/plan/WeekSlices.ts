import type { PlannedMeal } from "@/domain/plan/PlannedMeal";

/**
 * This week plus the following week for moving or assigning a dish.
 */
export class WeekSlices {
  mergeDays(current: readonly string[], next: readonly string[]): string[] {
    return [...current, ...next.filter((day) => !current.includes(day))];
  }

  mergeMeals(current: readonly PlannedMeal[], next: readonly PlannedMeal[]): PlannedMeal[] {
    const byId = new Map(current.map((meal) => [meal.id, meal]));
    for (const meal of next) {
      byId.set(meal.id, meal);
    }
    return [...byId.values()];
  }

  isAfterWeek(day: string, weekDays: readonly string[]): boolean {
    const last = weekDays[weekDays.length - 1];
    return Boolean(last && day > last);
  }
}
