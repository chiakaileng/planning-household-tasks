import { TagNormalizer } from "@/domain/recipe/TagNormalizer";

/**
 * Tag chips are independent. Clicking one must not hide or replace the others.
 * A recipe matches when it has any selected tag (or when nothing is selected).
 */
export class RecipeTagFilter {
  private readonly names = new TagNormalizer();

  toggle(selected: readonly string[], tag: string): string[] {
    const name = this.names.normalize(tag);
    if (!name) {
      return [...selected];
    }
    return selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name];
  }

  matches(recipeTags: readonly string[], selected: readonly string[]): boolean {
    if (selected.length === 0) {
      return true;
    }
    return selected.some((tag) => recipeTags.includes(tag));
  }
}
