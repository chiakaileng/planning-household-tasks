/**
 * Default meals in a day. Change order or labels here — planners read this list.
 * Extra meals insert after one of these keys.
 */
export type DefaultMealSlot = {
  key: string;
  name: string;
  sortOrder: number;
};

export const defaultMealSlots: readonly DefaultMealSlot[] = [
  { key: "breakfast", name: "Breakfast", sortOrder: 100 },
  { key: "lunch", name: "Lunch", sortOrder: 200 },
  { key: "dinner", name: "Dinner", sortOrder: 300 },
];
