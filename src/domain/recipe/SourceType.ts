/**
 * How the recipe entered the pool.
 * `generated` is reserved for Phase 2 (AI creation) and is not written in MVP-1.
 */
export const SOURCE_TYPES = ["url", "pasted", "generated"] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
