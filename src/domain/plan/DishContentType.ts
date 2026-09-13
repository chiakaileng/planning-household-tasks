export const DISH_CONTENT_TYPES = ["recipe", "leftovers_meal", "leftovers_text", "freeform"] as const;

export type DishContentType = (typeof DISH_CONTENT_TYPES)[number];

export function isDishContentType(value: string): value is DishContentType {
  return (DISH_CONTENT_TYPES as readonly string[]).includes(value);
}
