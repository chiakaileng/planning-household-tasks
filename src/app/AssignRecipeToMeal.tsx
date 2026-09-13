"use client";

import { useEffect, useMemo, useState } from "react";
import { MealPeopleFields } from "@/app/MealPeopleFields";
import type { SavedMember } from "@/domain/member/SavedMember";
import type { PlannedMeal } from "@/domain/plan/PlannedMeal";

type WeekPayload = {
  weekStart: string;
  days: string[];
  meals: PlannedMeal[];
};

export function AssignRecipeToMeal({ recipeId }: { recipeId: string }) {
  const [members, setMembers] = useState<SavedMember[]>([]);
  const [week, setWeek] = useState<WeekPayload | null>(null);
  const [date, setDate] = useState("");
  const [mealId, setMealId] = useState("");
  const [eaterIds, setEaterIds] = useState<string[]>([]);
  const [cookId, setCookId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch("/api/members").then((response) => response.json()),
      fetch("/api/week").then((response) => response.json()),
    ]).then(([memberData, weekData]: [{ members: SavedMember[] }, WeekPayload]) => {
      setMembers(memberData.members);
      setWeek(weekData);
      setDate(weekData.days[0] ?? "");
    });
  }, []);

  const mealsForDay = useMemo(
    () => (week?.meals ?? []).filter((meal) => meal.date === date),
    [week, date],
  );

  useEffect(() => {
    if (!mealsForDay.some((meal) => meal.id === mealId)) {
      setMealId(mealsForDay[0]?.id ?? "");
    }
  }, [mealsForDay, mealId]);

  async function assign() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/week/dishes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mealId,
        draft: {
          contentType: "recipe",
          recipeId,
          sourceMealId: null,
          leftoverText: null,
          freeformText: null,
          cookMemberId: cookId,
          eaterMemberIds: eaterIds,
        },
      }),
    });
    const result = (await response.json()) as { kind?: string; error?: string };
    setMessage(result.kind === "saved" ? "Added to that meal." : (result.error ?? "Could not add."));
    setBusy(false);
  }

  return (
    <section className="review">
      <h2 className="section-title">Add to a meal</h2>
      <p className="caption">This recipe is content for a meal — pick the day and slot.</p>
      {week ? (
        <label>
          Day
          <select className="field" value={date} onChange={(event) => setDate(event.target.value)}>
            {week.days.map((day) => (
              <option key={day} value={day}>
                {dayLabel(day)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="caption">Loading this week…</p>
      )}
      <label>
        Meal
        <select className="field" value={mealId} onChange={(event) => setMealId(event.target.value)}>
          {mealsForDay.map((meal) => (
            <option key={meal.id} value={meal.id}>
              {meal.name}
            </option>
          ))}
        </select>
      </label>
      <MealPeopleFields
        members={members}
        eaterIds={eaterIds}
        cookId={cookId}
        onEaters={setEaterIds}
        onCook={setCookId}
      />
      <button type="button" className="btn" disabled={busy || members.length === 0} onClick={() => void assign()}>
        Add to meal
      </button>
      {message ? <p className="status status-ok">{message}</p> : null}
    </section>
  );
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
