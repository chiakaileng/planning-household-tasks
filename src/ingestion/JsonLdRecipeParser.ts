import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { IngredientLineParser } from "@/ingestion/IngredientLineParser";
import { RecipeNutritionParser } from "@/ingestion/RecipeNutritionParser";
import type { IJsonLdRecipeParser } from "@/ingestion/IJsonLdRecipeParser";

/**
 * Maps schema.org Recipe JSON-LD only. No site-specific HTML selectors.
 */
export class JsonLdRecipeParser implements IJsonLdRecipeParser {
  constructor(
    private readonly ingredientParser: IngredientLineParser,
    private readonly nutritionParser = new RecipeNutritionParser(),
  ) {}

  parse(html: string, sourceUrl: string): RecipeDraft | null {
    const blocks = extractJsonLdBlocks(html);
    for (const block of blocks) {
      const recipeNode = findRecipeNode(block);
      if (!recipeNode) {
        continue;
      }

      const title = asString(recipeNode.name);
      const ingredientLines = asStringList(recipeNode.recipeIngredient);
      const steps = instructionLines(recipeNode.recipeInstructions);
      const servings = parseServings(recipeNode.recipeYield);
      const nutrition = this.nutritionParser.parse(recipeNode.nutrition ?? recipeNode);

      // Spec: missing required fields (title or ingredients) → Phase 1 failure.
      if (!title || ingredientLines.length === 0) {
        continue;
      }

      return {
        title,
        servings,
        ...nutrition,
        ingredients: this.ingredientParser.parseAll(ingredientLines),
        steps,
        sourceType: "url",
        sourceUrl,
        sourceText: null,
        notes: null,
        tags: [],
        emojis: [],
      };
    }

    return null;
  }
}

function extractJsonLdBlocks(html: string): unknown[] {
  const matches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const blocks: unknown[] = [];
  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // Ignore broken JSON-LD; caller may still fall back to Phase 1b.
    }
  }
  return blocks;
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  const record = node as Record<string, unknown>;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (hasRecipeType(record["@type"])) {
    return record;
  }

  if (record["@graph"]) {
    return findRecipeNode(record["@graph"]);
  }

  return null;
}

function hasRecipeType(typeValue: unknown): boolean {
  if (typeof typeValue === "string") {
    return typeValue === "Recipe";
  }
  if (Array.isArray(typeValue)) {
    return typeValue.includes("Recipe");
  }
  return false;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function asStringList(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function instructionLines(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return splitParagraphs(value);
  }
  if (!Array.isArray(value)) {
    return [];
  }

  const lines: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      lines.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const text = asString(record.text) ?? asString(record.name);
      if (text) {
        lines.push(text);
      }
    }
  }
  return lines;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseServings(value: unknown): number | null {
  const text = Array.isArray(value) ? asString(value[0]) : asString(value) ?? (typeof value === "number" ? String(value) : null);
  if (!text) {
    return null;
  }
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}
