export const RECAP_LENSES = ["eats", "cooks"] as const;

export type RecapLens = (typeof RECAP_LENSES)[number];

/**
 * Eating and cooking chips are independent. None selected is fine — the recap shows no meals.
 */
export class RecapRoleFilter {
  toggle(selected: readonly RecapLens[], lens: RecapLens): RecapLens[] {
    return selected.includes(lens) ? selected.filter((item) => item !== lens) : [...selected, lens];
  }

  includes(selected: readonly RecapLens[], lens: RecapLens): boolean {
    return selected.includes(lens);
  }

  ordered(selected: readonly RecapLens[]): RecapLens[] {
    return RECAP_LENSES.filter((lens) => selected.includes(lens));
  }
}
