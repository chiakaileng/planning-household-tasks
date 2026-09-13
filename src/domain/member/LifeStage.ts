export const LIFE_STAGES = ["kid", "adult"] as const;

export type LifeStage = (typeof LIFE_STAGES)[number];

export function isLifeStage(value: string): value is LifeStage {
  return (LIFE_STAGES as readonly string[]).includes(value);
}
