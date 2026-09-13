/**
 * One rule for member names: trim, reject blanks, compare without case.
 * Duplicates are allowed after a warning — this only detects the clash.
 */
export class MemberName {
  parse(raw: string): string | null {
    const value = raw.trim();
    return value.length > 0 ? value : null;
  }

  sameIgnoreCase(left: string, right: string): boolean {
    return left.trim().toLowerCase() === right.trim().toLowerCase();
  }
}
