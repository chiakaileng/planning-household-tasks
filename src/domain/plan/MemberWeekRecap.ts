import type { PlannedDish, PlannedMeal } from "@/domain/plan/PlannedMeal";
import type { RecapLens } from "@/domain/plan/RecapRoleFilter";

export type RecapRole = "eats" | "cooks" | "both";

export type RecapDish = {
  dishId: string;
  mealId: string;
  date: string;
  slotKey: string;
  slotName: string;
  title: string;
  contentType: string;
  recipeId: string | null;
  recipeMissing: boolean;
  role: RecapRole;
};

export type RecapDay = {
  date: string;
  dishes: RecapDish[];
};

/**
 * Turns the meal-first week into one member’s eat/cook glance.
 * Always returns every day in the week so the recap can share the calendar columns.
 */
export class MemberWeekRecap {
  daysFor(
    memberId: string,
    meals: readonly PlannedMeal[],
    days: readonly string[],
    lens?: RecapLens,
  ): RecapDay[] {
    return days.map((date) => ({
      date,
      dishes: meals
        .filter((meal) => meal.date === date)
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .flatMap((meal) =>
          meal.dishes
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .flatMap((dish) => {
              const role = roleFor(memberId, dish, lens);
              return role ? [{ ...toRecapDish(meal, dish), role }] : [];
            }),
        ),
    }));
  }
}

function roleFor(memberId: string, dish: PlannedDish, lens?: RecapLens): RecapRole | null {
  const eats = dish.eaters.some((eater) => eater.memberId === memberId);
  const cooks = dish.cookMemberId === memberId;
  if (lens === "eats") {
    return eats ? "eats" : null;
  }
  if (lens === "cooks") {
    return cooks ? "cooks" : null;
  }
  if (eats && cooks) {
    return "both";
  }
  if (eats) {
    return "eats";
  }
  if (cooks) {
    return "cooks";
  }
  return null;
}

function toRecapDish(meal: PlannedMeal, dish: PlannedDish): Omit<RecapDish, "role"> {
  return {
    dishId: dish.id,
    mealId: dish.mealId,
    date: meal.date,
    slotKey: meal.slotKey,
    slotName: meal.name,
    title: dish.title,
    contentType: dish.contentType,
    recipeId: dish.recipeId,
    recipeMissing: dish.recipeMissing,
  };
}
