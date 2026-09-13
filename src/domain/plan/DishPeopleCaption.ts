/**
 * Calendar glance: eaters first, then cook. Empty names stay readable, not blank.
 */
export class DishPeopleCaption {
  format(dish: { eaters: readonly { name: string }[]; cookName: string }): string {
    const eaters = dish.eaters.map((eater) => eater.name.trim()).filter(Boolean).join(", ") || "No eaters";
    const cook = dish.cookName.trim() || "No cook";
    return `${eaters} · cook ${cook}`;
  }
}
