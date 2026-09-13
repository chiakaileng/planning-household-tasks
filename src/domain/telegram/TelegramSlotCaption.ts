import { defaultMealSlots } from "@/config/weekMeals";
import { TelegramDateCaption } from "@/domain/plan/TelegramDateCaption";
import type { PlannedSlot } from "@/domain/telegram/TelegramWhenParser";

/**
 * “Fri dinner” labels for interview prompts. Locale/timezone come from config.
 */
export class TelegramSlotCaption {
  constructor(
    private readonly dates: TelegramDateCaption,
    private readonly slots: readonly { key: string; name: string }[] = defaultMealSlots,
  ) {}

  day(isoDate: string): string {
    return this.dates.weekday(isoDate);
  }

  meal(slotKey: string): string {
    return this.slots.find((slot) => slot.key === slotKey)?.name.toLowerCase() ?? slotKey;
  }

  one(slot: PlannedSlot): string {
    return `${this.day(slot.date)} ${this.meal(slot.slotKey)}`;
  }

  many(slots: readonly PlannedSlot[]): string {
    return slots.map((slot) => this.one(slot)).join(", ");
  }

  cookWhen(slots: readonly PlannedSlot[]): string {
    if (slots.length === 0) {
      return "";
    }
    const days = [...new Set(slots.map((slot) => slot.date))];
    if (days.length === 1 && slots.length > 1) {
      return this.day(days[0]!);
    }
    return this.many(slots);
  }
}
