import type { ExtraMealTemplate } from "@/domain/plan/ExtraMealPlacement";
import type { DishDraft } from "@/domain/plan/DishDraft";
import type { LeftoverSourceMeal, PlannedDish, PlannedMeal } from "@/domain/plan/PlannedMeal";

export interface IMealPlanRepository {
  ensureWeek(weekStart: string): Promise<PlannedMeal[]>;
  listWeek(weekStart: string): Promise<PlannedMeal[]>;
  getMeal(id: string): Promise<PlannedMeal | null>;
  addDish(mealId: string, draft: DishDraft): Promise<PlannedDish>;
  updateDish(dishId: string, draft: DishDraft, mealId?: string | null): Promise<PlannedDish | null>;
  removeDish(dishId: string): Promise<boolean>;
  addExtraMeal(input: { name: string; insertAfterSlotKey: string; weekStart: string; recurs: boolean }): Promise<ExtraMealTemplate>;
  leftoverSources(fromDate: string, toDate: string): Promise<LeftoverSourceMeal[]>;
}
