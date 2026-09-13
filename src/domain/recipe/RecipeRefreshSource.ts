/**
 * Refresh can only re-run ingest when we still have the original URL or paste.
 */
export function recipeHasRefreshSource(recipe: {
  sourceUrl: string | null;
  sourceText: string | null;
}): boolean {
  return Boolean(recipe.sourceUrl?.trim() || recipe.sourceText?.trim());
}
