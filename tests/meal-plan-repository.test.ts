import { afterAll, describe, expect, it } from "vitest";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import type { DishDraft } from "@/domain/plan/DishDraft";
import { WeekRange } from "@/domain/plan/WeekRange";
import { prisma } from "@/persistence/prisma";
import { MealPlanRepository } from "@/persistence/MealPlanRepository";
import { MemberRepository } from "@/persistence/MemberRepository";
import { emptyRecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import { RecipeRepository } from "@/persistence/RecipeRepository";

const weeks = new WeekRange(new CalendarDate("Asia/Singapore"), 1);
const meals = new MealPlanRepository(prisma, weeks);
const members = new MemberRepository(prisma);
const recipes = new RecipeRepository(prisma);

describe("MealPlanRepository", () => {
  const createdMemberIds: string[] = [];
  const createdRecipeIds: string[] = [];

  afterAll(async () => {
    await prisma.mealDish.deleteMany({
      where: { meal: { date: { startsWith: "2099-" } } },
    });
    await prisma.meal.deleteMany({ where: { date: { startsWith: "2099-" } } });
    await prisma.extraMealTemplate.deleteMany({ where: { appliesFromWeek: "2099-01-05" } });
    if (createdRecipeIds.length > 0) {
      await prisma.recipe.deleteMany({ where: { id: { in: createdRecipeIds } } });
    }
    if (createdMemberIds.length > 0) {
      await prisma.member.deleteMany({ where: { id: { in: createdMemberIds } } });
    }
    await prisma.$disconnect();
  });

  it("ensures empty meals and can add each content type", async () => {
    const week = await meals.ensureWeek("2099-01-06");
    const breakfast = week.find((meal) => meal.date === "2099-01-05" && meal.slotKey === "breakfast");
    const lunch = week.find((meal) => meal.date === "2099-01-05" && meal.slotKey === "lunch");
    expect(breakfast?.dishes).toEqual([]);
    expect(lunch).toBeTruthy();

    const adult = await members.create({
      name: `Planner Adult ${Date.now()}`,
      lifeStage: "adult",
      avatarMode: "initials",
      avatarPresetKey: null,
    });
    createdMemberIds.push(adult.id);
    const kid = await members.create({
      name: `Planner Kid ${Date.now()}`,
      lifeStage: "kid",
      avatarMode: "initials",
      avatarPresetKey: null,
    });
    createdMemberIds.push(kid.id);

    const recipe = await recipes.save({
      title: "Test noodles",
      servings: 2,
      ingredients: [{ name: "noodles", quantity: "1", unit: "pack", note: null, parseFlagged: false }],
      steps: ["Boil."],
      sourceType: "pasted",
      sourceUrl: null,
      sourceText: `plan-test-${Date.now()}`,
      notes: "freezer friendly",
      tags: ["family"],
      emojis: [],
      ...emptyRecipeNutrition(),
    });
    createdRecipeIds.push(recipe.id);

    const recipeDish = await meals.addDish(lunch!.id, people(adult.id, [adult.id, kid.id], {
      contentType: "recipe",
      recipeId: recipe.id,
    }));
    expect(recipeDish.title).toBe("Test noodles");
    expect(recipeDish.eaters.map((eater) => eater.memberId)).toEqual([adult.id, kid.id]);

    const leftoverMeal = await meals.addDish(breakfast!.id, people(adult.id, [kid.id], {
      contentType: "leftovers_meal",
      sourceMealId: lunch!.id,
      sourceDishId: recipeDish.id,
    }));
    expect(leftoverMeal.title).toBe("Leftovers: Test noodles");

    const leftoverText = await meals.addDish(breakfast!.id, people(adult.id, [adult.id], {
      contentType: "leftovers_text",
      leftoverText: "  last night curry  ",
    }));
    expect(leftoverText.title).toBe("last night curry");

    const takeaway = await meals.addDish(breakfast!.id, people(kid.id, [kid.id], {
      contentType: "freeform",
      freeformText: "McDonald's",
    }));
    expect(takeaway.title).toBe("McDonald's");
    expect(takeaway.cookMemberId).toBe(kid.id);

    const eatersOnly = await meals.addDish(breakfast!.id, people("", [adult.id], {
      contentType: "freeform",
      freeformText: "Takeaway noodles",
    }));
    expect(eatersOnly.title).toBe("Takeaway noodles");
    expect(eatersOnly.cookMemberId).toBeNull();
    expect(eatersOnly.eaters.map((eater) => eater.memberId)).toEqual([adult.id]);

    const listed = await meals.listWeek("2099-01-05");
    const savedBreakfast = listed.find((meal) => meal.id === breakfast!.id);
    expect(savedBreakfast?.dishes).toHaveLength(4);

    await expect(meals.addDish(breakfast!.id, people(adult.id, [adult.id], { contentType: "freeform", freeformText: "   " }))).rejects.toThrow();

    const extra = await meals.addExtraMeal({
      name: "Snack",
      insertAfterSlotKey: "lunch",
      weekStart: "2099-01-05",
      recurs: true,
    });
    expect(extra.recurs).toBe(true);
    const withExtra = await meals.listWeek("2099-01-05");
    expect(withExtra.some((meal) => meal.name === "Snack" && meal.date === "2099-01-05")).toBe(true);
    const later = await meals.ensureWeek("2099-01-12");
    expect(later.some((meal) => meal.name === "Snack")).toBe(true);
    expect(later.find((meal) => meal.name === "Snack")?.dishes).toEqual([]);

    const turnedLeftover = await meals.updateDish(
      takeaway.id,
      people(kid.id, [kid.id], {
        contentType: "leftovers_meal",
        sourceMealId: lunch!.id,
        sourceDishId: recipeDish.id,
      }),
    );
    expect(turnedLeftover?.title).toBe("Leftovers: Test noodles");
    expect(turnedLeftover?.contentType).toBe("leftovers_meal");
    expect(turnedLeftover?.sourceDishId).toBe(recipeDish.id);
    expect(turnedLeftover?.recipeId).toBeNull();
  });

  it("moves a dish onto another meal, including next week", async () => {
    const thisWeek = await meals.ensureWeek("2099-02-03");
    const nextWeek = await meals.ensureWeek("2099-02-10");
    const mondayDinner = thisWeek.find((meal) => meal.date === "2099-02-02" && meal.slotKey === "dinner");
    const nextMondayDinner = nextWeek.find((meal) => meal.date === "2099-02-09" && meal.slotKey === "dinner");
    expect(mondayDinner && nextMondayDinner).toBeTruthy();

    const adult = await members.create({
      name: `Mover Adult ${Date.now()}`,
      lifeStage: "adult",
      avatarMode: "initials",
      avatarPresetKey: null,
    });
    createdMemberIds.push(adult.id);

    const dish = await meals.addDish(
      mondayDinner!.id,
      people(adult.id, [adult.id], { contentType: "freeform", freeformText: "Laksa" }),
    );
    const moved = await meals.updateDish(
      dish.id,
      people(adult.id, [adult.id], { contentType: "freeform", freeformText: "Laksa" }),
      nextMondayDinner!.id,
    );
    expect(moved?.id).toBe(dish.id);
    expect(moved?.title).toBe("Laksa");

    const listedThis = await meals.listWeek("2099-02-02");
    const listedNext = await meals.listWeek("2099-02-09");
    expect(listedThis.find((meal) => meal.id === mondayDinner!.id)?.dishes.map((item) => item.id)).not.toContain(dish.id);
    expect(listedNext.find((meal) => meal.id === nextMondayDinner!.id)?.dishes.map((item) => item.id)).toContain(dish.id);
  });
});

function people(
  cookMemberId: string,
  eaterMemberIds: string[],
  overrides: Partial<DishDraft>,
): DishDraft {
  return {
    contentType: "freeform",
    recipeId: null,
    sourceMealId: null,
    sourceDishId: null,
    leftoverText: null,
    freeformText: null,
    cookMemberId,
    eaterMemberIds,
    ...overrides,
  };
}
