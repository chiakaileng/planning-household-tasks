import type { PrismaClient } from "@prisma/client";
import { defaultMealSlots } from "@/config/weekMeals";
import { DishContent } from "@/domain/plan/DishContent";
import type { DishDraft } from "@/domain/plan/DishDraft";
import { ExtraMealPlacement, type ExtraMealTemplate } from "@/domain/plan/ExtraMealPlacement";
import type { LeftoverSourceMeal, PlannedDish, PlannedEater, PlannedMeal } from "@/domain/plan/PlannedMeal";
import { WeekRange } from "@/domain/plan/WeekRange";
import type { IMealPlanRepository } from "@/persistence/IMealPlanRepository";

export class MealPlanRepository implements IMealPlanRepository {
  private readonly content = new DishContent();
  private readonly extras = new ExtraMealPlacement(defaultMealSlots);

  constructor(
    private readonly db: PrismaClient,
    private readonly weeks: WeekRange,
  ) {}

  async ensureWeek(weekStart: string): Promise<PlannedMeal[]> {
    const start = this.weeks.startOfWeek(weekStart);
    const days = this.weeks.days(start);
    const templates = await this.listTemplates();
    const slots = this.extras.slotsForWeek(start, templates);

    for (const date of days) {
      for (const slot of slots) {
        await this.db.meal.upsert({
          where: { date_slotKey: { date, slotKey: slot.slotKey } },
          create: {
            date,
            slotKey: slot.slotKey,
            name: slot.name,
            sortOrder: slot.sortOrder,
            isExtra: slot.isExtra,
          },
          update: {
            name: slot.name,
            sortOrder: slot.sortOrder,
            isExtra: slot.isExtra,
          },
        });
      }
    }

    return this.listWeek(start);
  }

  async listWeek(weekStart: string): Promise<PlannedMeal[]> {
    const start = this.weeks.startOfWeek(weekStart);
    const days = this.weeks.days(start);
    const rows = await this.db.meal.findMany({
      where: { date: { in: days } },
      include: mealInclude,
      orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
    });
    return rows.map(toPlannedMeal);
  }

  async getMeal(id: string): Promise<PlannedMeal | null> {
    const row = await this.db.meal.findUnique({ where: { id }, include: mealInclude });
    return row ? toPlannedMeal(row) : null;
  }

  async addDish(mealId: string, draft: DishDraft): Promise<PlannedDish> {
    const meal = await this.db.meal.findUnique({ where: { id: mealId } });
    if (!meal) {
      throw new Error("That meal is not on the week.");
    }
    const prepared = await this.prepareDish(draft);
    const last = await this.db.mealDish.aggregate({
      where: { mealId },
      _max: { sortOrder: true },
    });
    const created = await this.db.mealDish.create({
      data: {
        mealId,
        ...prepared.fields,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        eaters: { create: prepared.eaters },
      },
      include: dishInclude,
    });
    return toPlannedDish(created);
  }

  async updateDish(dishId: string, draft: DishDraft): Promise<PlannedDish | null> {
    const existing = await this.db.mealDish.findUnique({ where: { id: dishId } });
    if (!existing) {
      return null;
    }
    const prepared = await this.prepareDish(draft);
    await this.db.$transaction(async (tx) => {
      await tx.mealDishEater.deleteMany({ where: { dishId } });
      await tx.mealDish.update({
        where: { id: dishId },
        data: prepared.fields,
      });
      await tx.mealDishEater.createMany({
        data: prepared.eaters.map((eater) => ({ ...eater, dishId })),
      });
    });
    const updated = await this.db.mealDish.findUnique({ where: { id: dishId }, include: dishInclude });
    return updated ? toPlannedDish(updated) : null;
  }

  async removeDish(dishId: string): Promise<boolean> {
    const existing = await this.db.mealDish.findUnique({ where: { id: dishId } });
    if (!existing) {
      return false;
    }
    await this.db.mealDish.delete({ where: { id: dishId } });
    return true;
  }

  async addExtraMeal(input: {
    name: string;
    insertAfterSlotKey: string;
    weekStart: string;
    recurs: boolean;
  }): Promise<ExtraMealTemplate> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Name the extra meal.");
    }
    const weekStart = this.weeks.startOfWeek(input.weekStart);
    const created = await this.db.extraMealTemplate.create({
      data: {
        name,
        insertAfterSlotKey: input.insertAfterSlotKey,
        appliesFromWeek: weekStart,
        recurs: input.recurs,
      },
    });
    await this.ensureWeek(weekStart);
    return {
      id: created.id,
      name: created.name,
      insertAfterSlotKey: created.insertAfterSlotKey,
      appliesFromWeek: created.appliesFromWeek,
      recurs: created.recurs,
    };
  }

  async leftoverSources(fromDate: string, toDate: string): Promise<LeftoverSourceMeal[]> {
    const rows = await this.db.meal.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        dishes: { some: {} },
      },
      orderBy: [{ date: "desc" }, { sortOrder: "asc" }],
    });
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      name: row.name,
      label: this.content.leftoverMealLabel(row.name, row.date),
    }));
  }

  private async listTemplates(): Promise<ExtraMealTemplate[]> {
    const rows = await this.db.extraMealTemplate.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      insertAfterSlotKey: row.insertAfterSlotKey,
      appliesFromWeek: row.appliesFromWeek,
      recurs: row.recurs,
    }));
  }

  private async prepareDish(draft: DishDraft): Promise<{
    fields: {
      contentType: string;
      recipeId: string | null;
      sourceMealId: string | null;
      leftoverText: string | null;
      freeformText: string | null;
      titleSnapshot: string;
      cookMemberId: string;
      cookNameSnapshot: string;
    };
    eaters: { memberId: string; nameSnapshot: string }[];
  }> {
    if (draft.eaterMemberIds.length === 0) {
      throw new Error("Pick at least one eater.");
    }
    const uniqueEaterIds = [...new Set(draft.eaterMemberIds)];
    const members = await this.db.member.findMany({
      where: { id: { in: [...uniqueEaterIds, draft.cookMemberId] } },
    });
    const byId = new Map(members.map((member) => [member.id, member]));
    const cook = byId.get(draft.cookMemberId);
    if (!cook) {
      throw new Error("Pick who cooks.");
    }
    const eaters = uniqueEaterIds.map((id) => {
      const member = byId.get(id);
      if (!member) {
        throw new Error("One of the eaters is not on the household list.");
      }
      return { memberId: member.id, nameSnapshot: member.name };
    });

    let contentType = draft.contentType;
    let leftoverText = emptyToNull(draft.leftoverText);
    let sourceMealId = draft.sourceMealId;
    let recipeTitle: string | null = null;
    let sourceMealLabel: string | null = null;

    if (draft.contentType === "recipe") {
      if (!draft.recipeId) {
        throw new Error("Pick a recipe from the pool.");
      }
      const recipe = await this.db.recipe.findUnique({ where: { id: draft.recipeId } });
      if (!recipe) {
        throw new Error("That recipe is not in the pool.");
      }
      recipeTitle = recipe.title;
    }

    if (draft.contentType === "leftovers_meal") {
      if (!draft.sourceMealId) {
        throw new Error("Pick which meal these leftovers are from.");
      }
      const source = await this.db.meal.findUnique({
        where: { id: draft.sourceMealId },
        include: { dishes: true },
      });
      if (!source || source.dishes.length === 0) {
        throw new Error("That leftover source is not a planned meal.");
      }
      sourceMealLabel = this.content.leftoverMealLabel(source.name, source.date);
    }

    const error = this.content.validate({
      contentType: draft.contentType,
      recipeId: draft.recipeId,
      sourceMealId: draft.sourceMealId,
      leftoverText: draft.leftoverText,
      freeformText: draft.freeformText,
    });
    if (error) {
      throw new Error(error);
    }

    if (contentType === "leftovers_meal" && !sourceMealId) {
      contentType = "leftovers_text";
      leftoverText = leftoverText ?? sourceMealLabel;
    }

    return {
      fields: {
        contentType,
        recipeId: draft.contentType === "recipe" ? draft.recipeId : null,
        sourceMealId: contentType === "leftovers_meal" ? sourceMealId : null,
        leftoverText: contentType === "leftovers_text" ? leftoverText : null,
        freeformText: draft.contentType === "freeform" ? emptyToNull(draft.freeformText) : null,
        titleSnapshot: this.content.title(
          {
            contentType,
            recipeId: draft.recipeId,
            sourceMealId,
            leftoverText,
            freeformText: draft.freeformText,
          },
          { recipeTitle, sourceMealLabel },
        ),
        cookMemberId: cook.id,
        cookNameSnapshot: cook.name,
      },
      eaters,
    };
  }
}

const dishInclude = {
  recipe: true,
  eaters: true,
} as const;

const mealInclude = {
  dishes: { include: dishInclude, orderBy: { sortOrder: "asc" as const } },
};

type DishRow = {
  id: string;
  mealId: string;
  contentType: string;
  recipeId: string | null;
  recipe: { title: string } | null;
  sourceMealId: string | null;
  leftoverText: string | null;
  freeformText: string | null;
  titleSnapshot: string;
  cookMemberId: string | null;
  cookNameSnapshot: string;
  sortOrder: number;
  eaters: { memberId: string | null; nameSnapshot: string }[];
};

type MealRow = {
  id: string;
  date: string;
  slotKey: string;
  name: string;
  sortOrder: number;
  isExtra: boolean;
  dishes: DishRow[];
};

function toPlannedMeal(row: MealRow): PlannedMeal {
  return {
    id: row.id,
    date: row.date,
    slotKey: row.slotKey,
    name: row.name,
    sortOrder: row.sortOrder,
    isExtra: row.isExtra,
    dishes: row.dishes.map(toPlannedDish),
  };
}

function toPlannedDish(row: DishRow): PlannedDish {
  const recipeMissing = row.contentType === "recipe" && !row.recipe;
  const contentType =
    row.contentType === "leftovers_meal" && !row.sourceMealId ? "leftovers_text" : row.contentType;
  const eaters: PlannedEater[] = row.eaters.map((eater) => ({
    memberId: eater.memberId,
    name: eater.nameSnapshot,
  }));
  return {
    id: row.id,
    mealId: row.mealId,
    contentType,
    recipeId: row.recipeId,
    recipeMissing,
    sourceMealId: row.sourceMealId,
    leftoverText: row.leftoverText,
    freeformText: row.freeformText,
    title: row.titleSnapshot,
    cookMemberId: row.cookMemberId,
    cookName: row.cookNameSnapshot,
    eaters,
    sortOrder: row.sortOrder,
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
