import type { SourceType } from "@/domain/recipe/SourceType";

/** URL wins; otherwise a paste. Empty source stays as the current type unless it was URL-only. */
export function sourceTypeFrom(sourceUrl: string | null, sourceText: string | null, fallback: SourceType): SourceType {
  if (sourceUrl?.trim()) {
    return "url";
  }
  if (sourceText?.trim()) {
    return "pasted";
  }
  return fallback === "generated" ? "generated" : "pasted";
}

export function emptyToNullSource(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
