import { defaultMealSlots } from "@/config/weekMeals";
import type { AppConfig } from "@/config/AppConfig";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import type { DishDraft } from "@/domain/plan/DishDraft";
import type { ExtraMealTemplate } from "@/domain/plan/ExtraMealPlacement";
import { LeftoverWindow } from "@/domain/plan/LeftoverWindow";
import type { LeftoverSourceMeal, PlannedDish, PlannedMeal } from "@/domain/plan/PlannedMeal";
import { WeekRange } from "@/domain/plan/WeekRange";
import type { IMealPlanRepository } from "@/persistence/IMealPlanRepository";

export class WeekMealPlanner {
  readonly calendar: CalendarDate;
  readonly weeks: WeekRange;
  readonly leftovers: LeftoverWindow;

  constructor(
    config: AppConfig,
    private readonly meals: IMealPlanRepository,
  ) {
    this.calendar = new CalendarDate(config.weekTimeZone);
    this.weeks = new WeekRange(this.calendar, config.weekStartsOn);
    this.leftovers = new LeftoverWindow(this.calendar, config.leftoverLookbackDays);
  }

  defaultSlots() {
    return defaultMealSlots;
  }

  async loadWeek(weekStart: string | null, now: Date = new Date()): Promise<{
    weekStart: string;
    days: string[];
    today: string;
    meals: PlannedMeal[];
  }> {
    const today = this.calendar.today(now);
    const start = this.weeks.startOfWeek(weekStart ?? this.weeks.startContainingToday(now));
    const meals = await this.meals.ensureWeek(start);
    return { weekStart: start, days: this.weeks.days(start), today, meals };
  }

  async leftoverSources(now: Date = new Date()): Promise<LeftoverSourceMeal[]> {
    const today = this.calendar.today(now);
    return this.meals.leftoverSources(this.leftovers.firstDate(today), today);
  }

  async addDish(mealId: string, draft: DishDraft): Promise<PlannedDish> {
    await this.assertLeftoverInWindow(draft);
    return this.meals.addDish(mealId, draft);
  }

  async updateDish(dishId: string, draft: DishDraft): Promise<PlannedDish | null> {
    await this.assertLeftoverInWindow(draft);
    return this.meals.updateDish(dishId, draft);
  }

  removeDish(dishId: string): Promise<boolean> {
    return this.meals.removeDish(dishId);
  }

  addExtraMeal(input: {
    name: string;
    insertAfterSlotKey: string;
    weekStart: string;
    recurs: boolean;
  }): Promise<ExtraMealTemplate> {
    return this.meals.addExtraMeal(input);
  }

  private async assertLeftoverInWindow(draft: DishDraft): Promise<void> {
    if (draft.contentType !== "leftovers_meal" || !draft.sourceMealId) {
      return;
    }
    const sources = await this.leftoverSources();
    if (!sources.some((source) => source.id === draft.sourceMealId)) {
      throw new Error("Leftovers can only come from meals in the last few days.");
    }
  }
}
