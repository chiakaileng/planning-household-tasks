import { recipeEmojiCatalog, type RecipeEmojiCatalog } from "@/config/recipeEmojis";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";

/**
 * Caps a recipe at the catalog max and suggests icons from title, tags, and ingredients.
 */
export class RecipeEmojiAssigner {
  constructor(private readonly catalog: RecipeEmojiCatalog = recipeEmojiCatalog) {}

  max(): number {
    return this.catalog.max;
  }

  palette(): readonly string[] {
    return this.catalog.palette;
  }

  clamp(emojis: readonly string[]): string[] {
    const unique: string[] = [];
    for (const raw of emojis) {
      const emoji = raw.trim();
      if (!emoji || unique.includes(emoji) || !this.catalog.palette.includes(emoji)) {
        continue;
      }
      unique.push(emoji);
      if (unique.length >= this.catalog.max) {
        break;
      }
    }
    return unique;
  }

  suggest(draft: Pick<RecipeDraft, "title" | "ingredients" | "tags" | "notes">): string[] {
    const haystack = [
      draft.title,
      draft.notes ?? "",
      ...draft.tags,
      ...draft.ingredients.map((ingredient) => ingredient.name),
    ]
      .join("\n")
      .toLowerCase();

    const found: string[] = [];
    for (const hint of this.catalog.hints) {
      if (found.length >= this.catalog.max) {
        break;
      }
      if (found.includes(hint.emoji)) {
        continue;
      }
      if (hint.keywords.some((keyword) => haystack.includes(keyword))) {
        found.push(hint.emoji);
      }
    }
    return this.clamp(found);
  }

  display(stored: readonly string[], draft: Pick<RecipeDraft, "title" | "ingredients" | "tags" | "notes">): string[] {
    const saved = this.clamp(stored);
    return saved.length > 0 ? saved : this.suggest(draft);
  }
}
