export type Ingredient = {
  name: string;
  quantity: string | null;
  unit: string | null;
  note: string | null;
  /** True when quantity/unit could not be parsed. The raw line is kept in `name`. */
  parseFlagged: boolean;
};
