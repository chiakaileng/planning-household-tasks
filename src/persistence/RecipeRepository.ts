import type { PrismaClient } from "@prisma/client";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import type { RecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import { emptyToNullSource, sourceTypeFrom } from "@/domain/recipe/RecipeSource";
import { TagNormalizer } from "@/domain/recipe/TagNormalizer";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";
import type { SourceType } from "@/domain/recipe/SourceType";
import { RecipeEmojiAssigner } from "@/domain/recipe/RecipeEmojiAssigner";
import { RecipeSearch } from "@/domain/plan/RecipeSearch";
import type { DuplicateWarning, IRecipeRepository, RecipeListQuery } from "@/persistence/IRecipeRepository";

const recipeInclude = {
  ingredients: true,
  steps: true,
  tags: { include: { tag: true } },
} as const;

export class RecipeRepository implements IRecipeRepository {
  private readonly tags = new TagNormalizer();
  private readonly search = new RecipeSearch();
  private readonly emojis = new RecipeEmojiAssigner();

  constructor(private readonly db: PrismaClient) {}

  async save(draft: RecipeDraft): Promise<SavedRecipe> {
    const tagNames = this.tags.normalizeAll(draft.tags);
    const created = await this.db.recipe.create({
      data: {
        title: draft.title,
        sourceType: draft.sourceType,
        sourceUrl: draft.sourceUrl,
        sourceText: draft.sourceText,
        servings: draft.servings,
        ...nutritionColumns(draft),
        notes: emptyToNull(draft.notes),
        emojis: JSON.stringify(this.emojis.clamp(draft.emojis)),
        ingredients: {
          create: draft.ingredients.map((ingredient, index) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            note: ingredient.note,
            parseFlagged: ingredient.parseFlagged,
            sortOrder: index,
          })),
        },
        steps: {
          create: draft.steps.map((instruction, index) => ({
            instruction,
            sortOrder: index,
          })),
        },
        tags: {
          create: tagNames.map((name) => ({
            tag: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          })),
        },
      },
      include: recipeInclude,
    });

    return toSaved(created);
  }

  async findDuplicate(draft: RecipeDraft, excludeId?: string): Promise<DuplicateWarning | null> {
    if (draft.sourceUrl) {
      const existing = await this.db.recipe.findFirst({
        where: {
          sourceUrl: draft.sourceUrl,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        return { kind: "url", existingId: existing.id, existingTitle: existing.title };
      }
    }

    if (draft.sourceText) {
      const needle = normalizeText(draft.sourceText);
      const candidates = await this.db.recipe.findMany({
        where: {
          sourceText: { not: null },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true, title: true, sourceText: true },
      });
      const match = candidates.find((row) => row.sourceText && normalizeText(row.sourceText) === needle);
      if (match) {
        return { kind: "text", existingId: match.id, existingTitle: match.title };
      }
    }

    return null;
  }

  async list(query: RecipeListQuery = {}): Promise<SavedRecipe[]> {
    const tag = query.tag ? this.tags.normalize(query.tag) : null;
    const rows = await this.db.recipe.findMany({
      ...(tag
        ? {
            where: {
              tags: {
                some: { tag: { name: tag } },
              },
            },
          }
        : {}),
      orderBy: { createdAt: "desc" },
      include: recipeInclude,
    });
    const saved = rows.map(toSaved);
    return query.q ? this.search.filter(saved, query.q) : saved;
  }

  async getById(id: string): Promise<SavedRecipe | null> {
    const row = await this.db.recipe.findUnique({
      where: { id },
      include: recipeInclude,
    });
    return row ? toSaved(row) : null;
  }

  async updateNotesAndTags(
    id: string,
    notes: string | null,
    tags: string[],
    emojis: string[] = [],
  ): Promise<SavedRecipe | null> {
    const existing = await this.db.recipe.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const tagNames = this.tags.normalizeAll(tags);
    await this.db.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id },
        data: { notes: emptyToNull(notes), emojis: JSON.stringify(this.emojis.clamp(emojis)) },
      });
      await tx.recipeTag.deleteMany({ where: { recipeId: id } });
      for (const name of tagNames) {
        const tag = await tx.tag.upsert({
          where: { name },
          create: { name },
          update: {},
        });
        await tx.recipeTag.create({
          data: { recipeId: id, tagId: tag.id },
        });
      }
    });

    return this.getById(id);
  }

  async update(id: string, draft: RecipeDraft): Promise<SavedRecipe | null> {
    const existing = await this.db.recipe.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    if (!draft.title.trim()) {
      throw new Error("Title is required.");
    }
    const tagNames = this.tags.normalizeAll(draft.tags);
    await this.db.$transaction(async (tx) => {
      await tx.ingredient.deleteMany({ where: { recipeId: id } });
      await tx.step.deleteMany({ where: { recipeId: id } });
      await tx.recipeTag.deleteMany({ where: { recipeId: id } });
      await tx.recipe.update({
        where: { id },
        data: {
          title: draft.title.trim(),
          servings: draft.servings,
          ...nutritionColumns(draft),
          ...sourceColumns(draft),
          notes: emptyToNull(draft.notes),
          emojis: JSON.stringify(this.emojis.clamp(draft.emojis)),
          ingredients: {
            create: draft.ingredients.map((ingredient, index) => ({
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              note: ingredient.note,
              parseFlagged: ingredient.parseFlagged,
              sortOrder: index,
            })),
          },
          steps: {
            create: draft.steps.map((instruction, index) => ({
              instruction,
              sortOrder: index,
            })),
          },
        },
      });
      for (const name of tagNames) {
        const tag = await tx.tag.upsert({
          where: { name },
          create: { name },
          update: {},
        });
        await tx.recipeTag.create({
          data: { recipeId: id, tagId: tag.id },
        });
      }
    });
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.db.recipe.findUnique({ where: { id } });
    if (!existing) {
      return false;
    }
    await this.db.recipe.delete({ where: { id } });
    return true;
  }
}

function parseEmojis(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function sourceColumns(draft: RecipeDraft) {
  const sourceUrl = emptyToNullSource(draft.sourceUrl);
  const sourceText = emptyToNullSource(draft.sourceText);
  return {
    sourceUrl,
    sourceText,
    sourceType: sourceTypeFrom(sourceUrl, sourceText, draft.sourceType),
  };
}

function nutritionColumns(draft: RecipeNutrition): RecipeNutrition {
  return {
    calories: draft.calories,
    protein: draft.protein,
    fat: draft.fat,
    carbohydrates: draft.carbohydrates,
    fibre: draft.fibre,
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

type RecipeRow = {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  sourceText: string | null;
  servings: number | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrates: number | null;
  fibre: number | null;
  notes: string | null;
  emojis: string;
  ingredients: {
    name: string;
    quantity: string | null;
    unit: string | null;
    note: string | null;
    parseFlagged: boolean;
    sortOrder: number;
  }[];
  steps: { instruction: string; sortOrder: number }[];
  tags: { tag: { name: string } }[];
};

function toSaved(row: RecipeRow): SavedRecipe {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.sourceType as SourceType,
    sourceUrl: row.sourceUrl,
    sourceText: row.sourceText,
    servings: row.servings,
    calories: row.calories,
    protein: row.protein,
    fat: row.fat,
    carbohydrates: row.carbohydrates,
    fibre: row.fibre,
    notes: row.notes,
    emojis: parseEmojis(row.emojis),
    tags: row.tags.map((link) => link.tag.name).sort(),
    ingredients: [...row.ingredients]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        note: ingredient.note,
        parseFlagged: ingredient.parseFlagged,
      })),
    steps: [...row.steps].sort((a, b) => a.sortOrder - b.sortOrder).map((step) => step.instruction),
  };
}
