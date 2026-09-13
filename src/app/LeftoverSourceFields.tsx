"use client";

import { LeftoverSourceChoice } from "@/domain/plan/LeftoverSourceChoice";
import type { LeftoverSourceMeal } from "@/domain/plan/PlannedMeal";

const choice = new LeftoverSourceChoice();

export function LeftoverSourceFields({
  sources,
  destMealId,
  editingDishId,
  sourceMealId,
  sourceDishId,
  onChange,
}: {
  sources: LeftoverSourceMeal[];
  destMealId: string;
  editingDishId: string | null;
  sourceMealId: string | null;
  sourceDishId: string | null;
  onChange: (next: { sourceMealId: string | null; sourceDishId: string | null }) => void;
}) {
  const meals = choice.meals(sources, destMealId);
  const source = meals.find((meal) => meal.id === sourceMealId);
  const dishes = choice.dishes(source, editingDishId);
  const days = uniqueDates(meals);

  if (meals.length === 0) {
    return (
      <p className="flag">
        Add a dish to another meal on this week or next week first — then you can pick it here.
      </p>
    );
  }

  return (
    <>
      <div className="row">
        <label className="grow">
          From day
          <select
            className="field"
            value={source?.date ?? ""}
            onChange={(event) => {
              const next =
                meals.find((meal) => meal.date === event.target.value && meal.slotKey === source?.slotKey) ??
                meals.find((meal) => meal.date === event.target.value);
              pickMeal(next?.id ?? null, meals, editingDishId, onChange);
            }}
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {weekdayLabel(day)} {dateLabel(day)}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          From meal
          <select
            className="field"
            value={source?.id ?? ""}
            onChange={(event) => pickMeal(event.target.value || null, meals, editingDishId, onChange)}
          >
            {meals
              .filter((meal) => meal.date === (source?.date ?? days[0]))
              .map((meal) => (
                <option key={meal.id} value={meal.id}>
                  {meal.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      {dishes.length === 0 ? (
        <p className="flag">That meal has no dishes to leftover.</p>
      ) : (
        <fieldset className="choice-set">
          <legend>Which dish</legend>
          {dishes.map((dish) => (
            <label key={dish.id} className="choice">
              <input
                type="radio"
                name="leftover-dish"
                checked={sourceDishId === dish.id}
                onChange={() => onChange({ sourceMealId: source?.id ?? null, sourceDishId: dish.id })}
              />
              {dish.title}
            </label>
          ))}
        </fieldset>
      )}
    </>
  );
}

function pickMeal(
  mealId: string | null,
  meals: LeftoverSourceMeal[],
  editingDishId: string | null,
  onChange: (next: { sourceMealId: string | null; sourceDishId: string | null }) => void,
) {
  const source = meals.find((meal) => meal.id === mealId);
  const dishes = choice.dishes(source, editingDishId);
  onChange({ sourceMealId: source?.id ?? null, sourceDishId: choice.dishId(dishes, null) });
}

function uniqueDates(meals: readonly LeftoverSourceMeal[]): string[] {
  return [...new Set(meals.map((meal) => meal.date))];
}

function weekdayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-SG", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function dateLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
