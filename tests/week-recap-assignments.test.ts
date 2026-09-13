import { afterAll, describe, expect, it } from "vitest";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import type { DishDraft } from "@/domain/plan/DishDraft";
import { MemberWeekRecap } from "@/domain/plan/MemberWeekRecap";
import type { PlannedMeal } from "@/domain/plan/PlannedMeal";
import { WeekRange } from "@/domain/plan/WeekRange";
import { emptyRecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import { MealPlanRepository } from "@/persistence/MealPlanRepository";
import { MemberRepository } from "@/persistence/MemberRepository";
import { prisma } from "@/persistence/prisma";
import { RecipeRepository } from "@/persistence/RecipeRepository";

const weeks = new WeekRange(new CalendarDate("Asia/Singapore"), 1);
const meals = new MealPlanRepository(prisma, weeks);
const members = new MemberRepository(prisma);
const recipes = new RecipeRepository(prisma);
const recap = new MemberWeekRecap();
const weekDate = "2099-03-03";

describe("assigning recipes across days and meals", () => {
  const createdMemberIds: string[] = [];
  const createdRecipeIds: string[] = [];

  afterAll(async () => {
    await prisma.mealDish.deleteMany({
      where: { meal: { date: { startsWith: "2099-03-" } } },
    });
    await prisma.meal.deleteMany({ where: { date: { startsWith: "2099-03-" } } });
    if (createdRecipeIds.length > 0) {
      await prisma.recipe.deleteMany({ where: { id: { in: createdRecipeIds } } });
    }
    if (createdMemberIds.length > 0) {
      await prisma.member.deleteMany({ where: { id: { in: createdMemberIds } } });
    }
    await prisma.$disconnect();
  });

  it("puts the right dishes on the right day, meal, person, and eat/cook row", async () => {
    const adult = await members.create({
      name: `Recap Adult ${Date.now()}`,
      lifeStage: "adult",
      avatarMode: "initials",
      avatarPresetKey: null,
    });
    const kid = await members.create({
      name: `Recap Kid ${Date.now()}`,
      lifeStage: "kid",
      avatarMode: "initials",
      avatarPresetKey: null,
    });
    createdMemberIds.push(adult.id, kid.id);

    const oats = await saveRecipe("Oats");
    const pasta = await saveRecipe("Pasta");
    const soup = await saveRecipe("Soup");

    const week = await meals.ensureWeek(weekDate);
    const days = [...new Set(week.map((meal) => meal.date))].sort();
    expect(days).toHaveLength(7);

    await meals.addDish(slot(week, days[0]!, "breakfast").id, people(adult.id, [kid.id], { contentType: "recipe", recipeId: oats.id }));
    await meals.addDish(slot(week, days[0]!, "dinner").id, people(adult.id, [adult.id, kid.id], { contentType: "recipe", recipeId: pasta.id }));
    await meals.addDish(slot(week, days[2]!, "lunch").id, people(adult.id, [adult.id], { contentType: "recipe", recipeId: soup.id }));
    await meals.addDish(slot(week, days[4]!, "dinner").id, people(kid.id, [kid.id], { contentType: "freeform", freeformText: "Pizza" }));

    const listed = await meals.listWeek(weekDate);
    expect(titlesOn(listed, days[1]!, "breakfast")).toEqual([]);
    expect(titlesOn(listed, days[0]!, "breakfast")).toEqual(["Oats"]);
    expect(titlesOn(listed, days[0]!, "dinner")).toEqual(["Pasta"]);
    expect(titlesOn(listed, days[2]!, "lunch")).toEqual(["Soup"]);
    expect(titlesOn(listed, days[4]!, "dinner")).toEqual(["Pizza"]);

    const kidEats = titlesByDay(recap.daysFor(kid.id, listed, days, "eats"));
    expect(kidEats[days[0]!]).toEqual(["Oats", "Pasta"]);
    expect(kidEats[days[2]!]).toEqual([]);
    expect(kidEats[days[4]!]).toEqual(["Pizza"]);

    const kidCooks = titlesByDay(recap.daysFor(kid.id, listed, days, "cooks"));
    expect(kidCooks[days[0]!]).toEqual([]);
    expect(kidCooks[days[4]!]).toEqual(["Pizza"]);

    const adultEats = titlesByDay(recap.daysFor(adult.id, listed, days, "eats"));
    expect(adultEats[days[0]!]).toEqual(["Pasta"]);
    expect(adultEats[days[2]!]).toEqual(["Soup"]);
    expect(adultEats[days[4]!]).toEqual([]);

    const adultCooks = titlesByDay(recap.daysFor(adult.id, listed, days, "cooks"));
    expect(adultCooks[days[0]!]).toEqual(["Oats", "Pasta"]);
    expect(adultCooks[days[2]!]).toEqual(["Soup"]);
    expect(adultCooks[days[4]!]).toEqual([]);
  });

  async function saveRecipe(title: string) {
    const recipe = await recipes.save({
      title,
      servings: 2,
      ingredients: [{ name: title.toLowerCase(), quantity: "1", unit: null, note: null, parseFlagged: false }],
      steps: ["Cook."],
      sourceType: "pasted",
      sourceUrl: null,
      sourceText: `recap-assign-${title}-${Date.now()}-${Math.random()}`,
      notes: null,
      tags: [],
      emojis: [],
      ...emptyRecipeNutrition(),
    });
    createdRecipeIds.push(recipe.id);
    return recipe;
  }
});

function slot(week: PlannedMeal[], date: string, slotKey: string): PlannedMeal {
  const meal = week.find((item) => item.date === date && item.slotKey === slotKey);
  if (!meal) {
    throw new Error(`Missing ${slotKey} on ${date}`);
  }
  return meal;
}

function titlesOn(week: PlannedMeal[], date: string, slotKey: string): string[] {
  return slot(week, date, slotKey).dishes.map((dish) => dish.title);
}

function titlesByDay(days: { date: string; dishes: { title: string }[] }[]): Record<string, string[]> {
  return Object.fromEntries(days.map((day) => [day.date, day.dishes.map((dish) => dish.title)]));
}

function people(cookMemberId: string, eaterMemberIds: string[], overrides: Partial<DishDraft>): DishDraft {
  return {
    contentType: "freeform",
    recipeId: null,
    sourceMealId: null,
    leftoverText: null,
    freeformText: null,
    cookMemberId,
    eaterMemberIds,
    ...overrides,
  };
}
