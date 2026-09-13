import type { PlannedMeal } from "@/domain/plan/PlannedMeal";
import { TelegramDateCaption } from "@/domain/plan/TelegramDateCaption";
import { TelegramHtmlText } from "@/domain/plan/TelegramHtmlText";

/**
 * Locked Telegram copy: days in calendar order, extras after the slot they follow,
 * title + cook, empty days marked. A recipe URL becomes a text link on the title.
 */
export class TelegramWeekMessage {
  private readonly html = new TelegramHtmlText();

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
    return `${heading}\n\n${dishLines(this.html, dayMeals).join("\n")}`;
  }

  private dayBlock(date: string, meals: PlannedMeal[]): string {
    const heading = this.dates.weekday(date);
    if (!dayHasDishes(meals)) {
      return `${heading}\n• (nothing planned)`;
    }
    return `${heading}\n${dishLines(this.html, meals).join("\n")}`;
  }
}

function mealsForDay(meals: readonly PlannedMeal[], date: string): PlannedMeal[] {
  return meals.filter((meal) => meal.date === date).slice().sort((left, right) => left.sortOrder - right.sortOrder);
}

function dayHasDishes(meals: readonly PlannedMeal[]): boolean {
  return meals.some((meal) => meal.dishes.length > 0);
}

function dishLines(html: TelegramHtmlText, meals: readonly PlannedMeal[]): string[] {
  return meals.flatMap((meal) =>
    meal.dishes
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((dish) => dishLine(html, meal.name, dish.title, dish.cookName, dish.sourceUrl)),
  );
}

function dishLine(
  html: TelegramHtmlText,
  mealName: string,
  title: string,
  cookName: string,
  sourceUrl: string | null,
): string {
  const cook = cookName.trim();
  const labeled = `${html.escape(mealName)} — ${html.recipeTitle(title, sourceUrl)}`;
  return cook ? `• ${labeled} · ${html.escape(cook)} cooks` : `• ${labeled}`;
}
