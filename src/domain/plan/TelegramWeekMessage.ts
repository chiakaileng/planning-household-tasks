import type { PlannedMeal } from "@/domain/plan/PlannedMeal";
import { TelegramDateCaption } from "@/domain/plan/TelegramDateCaption";

/**
 * Locked Telegram copy: days in calendar order, extras after the slot they follow,
 * title + cook, empty days marked. No ingredients, steps, or eaters.
 */
export class TelegramWeekMessage {
  constructor(private readonly dates: TelegramDateCaption) {}

  week(days: readonly string[], meals: readonly PlannedMeal[]): string {
    const blocks = days.map((date) => this.dayBlock(date, mealsForDay(meals, date)));
    return `This week · ${this.dates.weekRange(days)}\n\n${blocks.join("\n\n")}`;
  }

  tomorrow(date: string, meals: readonly PlannedMeal[]): string {
    const heading = `Tomorrow · ${this.dates.tomorrowHeading(date)}`;
    const dayMeals = mealsForDay(meals, date);
    if (!dayHasDishes(dayMeals)) {
      return `${heading}\n\nNothing planned tomorrow.`;
    }
    return `${heading}\n\n${dishLines(dayMeals).join("\n")}`;
  }

  private dayBlock(date: string, meals: PlannedMeal[]): string {
    const heading = this.dates.weekday(date);
    if (!dayHasDishes(meals)) {
      return `${heading}\n• (nothing planned)`;
    }
    return `${heading}\n${dishLines(meals).join("\n")}`;
  }
}

function mealsForDay(meals: readonly PlannedMeal[], date: string): PlannedMeal[] {
  return meals.filter((meal) => meal.date === date).slice().sort((left, right) => left.sortOrder - right.sortOrder);
}

function dayHasDishes(meals: readonly PlannedMeal[]): boolean {
  return meals.some((meal) => meal.dishes.length > 0);
}

function dishLines(meals: readonly PlannedMeal[]): string[] {
  return meals.flatMap((meal) =>
    meal.dishes
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((dish) => dishLine(meal.name, dish.title, dish.cookName)),
  );
}

function dishLine(mealName: string, title: string, cookName: string): string {
  const cook = cookName.trim();
  return cook ? `• ${mealName} — ${title} · ${cook} cooks` : `• ${mealName} — ${title}`;
}
