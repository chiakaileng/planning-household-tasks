/**
 * One rule for tags everywhere: trim, lowercase, drop blanks, keep each name once.
 * Do not special-case words like child/family — those are just tags you type.
 */
export class TagNormalizer {
  normalize(raw: string): string | null {
    const value = raw.trim().toLowerCase();
    return value.length > 0 ? value : null;
  }

  normalizeAll(raws: readonly string[]): string[] {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const raw of raws) {
      const name = this.normalize(raw);
      if (!name || seen.has(name)) {
        continue;
      }
      seen.add(name);
      unique.push(name);
    }
    return unique;
  }
}
