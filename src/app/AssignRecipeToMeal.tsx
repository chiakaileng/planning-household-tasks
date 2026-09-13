"use client";

import { useEffect, useMemo, useState } from "react";
import { MealPeopleFields } from "@/app/MealPeopleFields";
import { readApiJson } from "@/app/readApiJson";
import type { SavedMember } from "@/domain/member/SavedMember";
import type { PlannedMeal } from "@/domain/plan/PlannedMeal";
import { WeekSlices } from "@/domain/plan/WeekSlices";

const weekSlices = new WeekSlices();

type WeekPayload = {
  weekStart: string;
  days: string[];
  meals: PlannedMeal[];
  boardDays: string[];
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
    ]).then(async ([memberData, weekData]: [{ members: SavedMember[] }, WeekPayload]) => {
      setMembers(memberData.members);
      const nextStart = shiftIso(weekData.weekStart, 7);
      const nextWeek = (await fetch(`/api/week?start=${nextStart}`).then((response) => response.json())) as WeekPayload;
      setWeek({
        weekStart: weekData.weekStart,
        days: weekSlices.mergeDays(weekData.days, nextWeek.days),
        meals: weekSlices.mergeMeals(weekData.meals, nextWeek.meals),
        boardDays: weekData.days,
      });
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
          sourceDishId: null,
          leftoverText: null,
          freeformText: null,
          cookMemberId: cookId,
          eaterMemberIds: eaterIds,
        },
      }),
    });
    const result = await readApiJson<{ kind?: string; error?: string }>(response);
    const dest = week?.meals.find((meal) => meal.id === mealId);
    const onNextWeek = dest && week ? weekSlices.isAfterWeek(dest.date, week.boardDays) : false;
    setMessage(
      "kind" in result && result.kind === "saved"
        ? onNextWeek
          ? "Added to next week."
          : "Added to that meal."
        : (result.error ?? "Could not add."),
    );
    setBusy(false);
  }

  return (
    <section className="review">
      <h2 className="section-title">Add to a meal</h2>
      <p className="caption">This recipe is content for a meal — pick the day and slot. Next week is in the day list.</p>
      {week ? (
        <label>
          Day
          <select className="field" value={date} onChange={(event) => setDate(event.target.value)}>
            {week.days.map((day) => (
              <option key={day} value={day}>
                {weekSlices.isAfterWeek(day, week.boardDays) ? "Next · " : ""}
                {dayLabel(day)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="caption">Loading this week and next…</p>
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
      <button type="button" className="btn" disabled={busy} onClick={() => void assign()}>
        Add to meal
      </button>
      {message ? (
        <p className={`status ${message.startsWith("Added") ? "status-ok" : ""}`}>{message}</p>
      ) : null}
    </section>
  );
}

function shiftIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
