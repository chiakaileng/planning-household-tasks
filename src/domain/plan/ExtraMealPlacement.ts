import type { DefaultMealSlot } from "@/config/weekMeals";

export type ExtraMealTemplate = {
  id: string;
  name: string;
  insertAfterSlotKey: string;
  appliesFromWeek: string;
  recurs: boolean;
};

export type PlannedSlot = {
  slotKey: string;
  name: string;
  sortOrder: number;
  isExtra: boolean;
  extraTemplateId: string | null;
};

/**
 * Builds one day’s meal order: defaults plus extras that apply to this week.
 * Recurring extras starting this week or earlier appear; week-only extras only on their week.
 */
export class ExtraMealPlacement {
  constructor(private readonly defaults: readonly DefaultMealSlot[]) {}

  applies(template: ExtraMealTemplate, weekStart: string): boolean {
    if (template.appliesFromWeek > weekStart) {
      return false;
    }
    if (template.recurs) {
      return true;
    }
    return template.appliesFromWeek === weekStart;
  }

  slotsForWeek(weekStart: string, templates: readonly ExtraMealTemplate[]): PlannedSlot[] {
    const applicable = templates.filter((template) => this.applies(template, weekStart));
    const slots: PlannedSlot[] = this.defaults.map((slot) => ({
      slotKey: slot.key,
      name: slot.name,
      sortOrder: slot.sortOrder,
      isExtra: false,
      extraTemplateId: null,
    }));

    for (const template of applicable) {
      const after = slots.find((slot) => slot.slotKey === template.insertAfterSlotKey);
      const afterOrder = after?.sortOrder ?? this.defaults[this.defaults.length - 1]?.sortOrder ?? 0;
      const alreadyAfter = slots.filter(
        (slot) => slot.isExtra && slot.sortOrder > afterOrder && slot.sortOrder < afterOrder + 10,
      ).length;
      slots.push({
        slotKey: extraSlotKey(template.id),
        name: template.name,
        sortOrder: afterOrder + alreadyAfter + 1,
        isExtra: true,
        extraTemplateId: template.id,
      });
    }

    return slots.sort((left, right) => left.sortOrder - right.sortOrder);
  }
}

export function extraSlotKey(templateId: string): string {
  return `extra:${templateId}`;
}
