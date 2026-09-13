import type { LeftoverSourceDish, LeftoverSourceMeal, PlannedMeal } from "@/domain/plan/PlannedMeal";

/**
 * Which leftover meals and dishes can be picked, given the meal you are adding to.
 */
export class LeftoverSourceChoice {
  withBoard(sources: readonly LeftoverSourceMeal[], board: readonly PlannedMeal[]): LeftoverSourceMeal[] {
    const byId = new Map(sources.map((source) => [source.id, { ...source, dishes: [...(source.dishes ?? [])] }]));
    for (const meal of board) {
      const dishes = meal.dishes.map((dish) => ({ id: dish.id, title: dish.title }));
      if (dishes.length === 0) {
        continue;
      }
      const existing = byId.get(meal.id);
      byId.set(meal.id, {
        id: meal.id,
        date: meal.date,
        slotKey: meal.slotKey,
        name: meal.name,
        label: existing?.label ?? `${meal.name} · ${meal.date}`,
        dishes: existing?.dishes.length ? existing.dishes : dishes,
      });
    }
    return [...byId.values()].sort((left, right) => left.date.localeCompare(right.date) || left.slotKey.localeCompare(right.slotKey));
  }

  meals(sources: readonly LeftoverSourceMeal[], destMealId: string): LeftoverSourceMeal[] {
    return sources.filter((source) => source.id !== destMealId && (source.dishes ?? []).length > 0);
  }

  dishes(source: LeftoverSourceMeal | undefined, editingDishId: string | null): LeftoverSourceDish[] {
    return (source?.dishes ?? []).filter((dish) => dish.id !== editingDishId);
  }

  mealId(sources: readonly LeftoverSourceMeal[], destMealId: string, currentId: string | null): string | null {
    const meals = this.meals(sources, destMealId);
    if (currentId && meals.some((meal) => meal.id === currentId)) {
      return currentId;
    }
    return meals[0]?.id ?? null;
  }

  dishId(dishes: readonly LeftoverSourceDish[], currentId: string | null): string | null {
    if (currentId && dishes.some((dish) => dish.id === currentId)) {
      return currentId;
    }
    return dishes[0]?.id ?? null;
  }
}
