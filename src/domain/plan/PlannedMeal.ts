export type PlannedEater = {
  memberId: string | null;
  name: string;
};

export type PlannedDish = {
  id: string;
  mealId: string;
  contentType: string;
  recipeId: string | null;
  recipeMissing: boolean;
  sourceMealId: string | null;
  leftoverText: string | null;
  freeformText: string | null;
  title: string;
  cookMemberId: string | null;
  cookName: string;
  eaters: PlannedEater[];
  sortOrder: number;
};

export type PlannedMeal = {
  id: string;
  date: string;
  slotKey: string;
  name: string;
  sortOrder: number;
  isExtra: boolean;
  dishes: PlannedDish[];
};

export type LeftoverSourceMeal = {
  id: string;
  date: string;
  name: string;
  label: string;
};
