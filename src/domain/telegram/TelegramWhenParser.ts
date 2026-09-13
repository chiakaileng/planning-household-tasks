import { defaultMealSlots } from "@/config/weekMeals";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import { WeekRange } from "@/domain/plan/WeekRange";

export type PlannedSlot = {
  date: string;
  slotKey: string;
};

export type WhenParse =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "incomplete"; days: string[] }
  | { kind: "ok"; slots: PlannedSlot[] };

const WEEKDAYS: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

/**
 * Locked day/meal grammar for slash commands. Week bounds come from the same
 * calendar the home board uses — never the server’s local zone.
 */
export class TelegramWhenParser {
  private readonly mealsByToken: Map<string, string>;

  constructor(
    private readonly calendar: CalendarDate,
    private readonly weeks: WeekRange,
    slots: readonly { key: string }[] = defaultMealSlots,
  ) {
    this.mealsByToken = new Map();
    for (const slot of slots) {
      this.mealsByToken.set(slot.key.toLowerCase(), slot.key);
      const initial = slot.key.charAt(0).toLowerCase();
      if (initial && !this.mealsByToken.has(initial)) {
        this.mealsByToken.set(initial, slot.key);
      }
    }
  }

  tokens(raw: string): string[] {
    return raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  parse(raw: string, now: Date = new Date()): WhenParse {
    return this.parseTokens(this.tokens(raw), now);
  }

  /**
   * Leftmost suffix that is a complete when. Earlier tokens are the search.
   */
  splitSearch(raw: string, now: Date = new Date()): { search: string; when: WhenParse } {
    const parts = this.tokens(raw);
    if (parts.length === 0) {
      return { search: "", when: { kind: "none" } };
    }
    for (let index = 0; index < parts.length; index += 1) {
      if (!this.canStartDay(parts, index)) {
        continue;
      }
      const when = this.parseTokens(parts.slice(index), now);
      if (when.kind === "ok") {
        return { search: parts.slice(0, index).join(" "), when };
      }
    }
    return { search: parts.join(" "), when: { kind: "none" } };
  }

  /**
   * /cook today and /cook fri mean every usual slot on those days.
   */
  parseCookWhen(raw: string, now: Date = new Date()): WhenParse {
    const parsed = this.parse(raw, now);
    if (parsed.kind === "incomplete") {
      const slots: PlannedSlot[] = [];
      const mealKeys = [...new Set(this.mealsByToken.values())];
      for (const date of parsed.days) {
        for (const key of mealKeys) {
          slots.push({ date, slotKey: key });
        }
      }
      return slots.length > 0 ? { kind: "ok", slots } : { kind: "invalid" };
    }
    return parsed;
  }

  isDayToken(token: string): boolean {
    return token === "today" || token === "tomorrow" || WEEKDAYS[token] !== undefined;
  }

  private canStartDay(parts: string[], index: number): boolean {
    const token = parts[index];
    if (!token) {
      return false;
    }
    if (token === "next") {
      return Boolean(parts[index + 1] && WEEKDAYS[parts[index + 1]!] !== undefined);
    }
    return this.isDayToken(token);
  }

  private parseTokens(parts: string[], now: Date): WhenParse {
    if (parts.length === 0) {
      return { kind: "none" };
    }
    const pendingDays: string[] = [];
    const slots: PlannedSlot[] = [];
    let index = 0;
    while (index < parts.length) {
      const token = parts[index]!;
      if (token === "next") {
        const weekday = parts[index + 1];
        if (!weekday || WEEKDAYS[weekday] === undefined) {
          return { kind: "invalid" };
        }
        pendingDays.push(this.weekdayOnWeek(WEEKDAYS[weekday], 1, now));
        index += 2;
        continue;
      }
      if (this.isDayToken(token)) {
        pendingDays.push(this.resolveDay(token, now));
        index += 1;
        continue;
      }
      const slotKey = this.mealsByToken.get(token);
      if (slotKey) {
        if (pendingDays.length === 0) {
          return { kind: "invalid" };
        }
        for (const date of pendingDays) {
          slots.push({ date, slotKey });
        }
        pendingDays.length = 0;
        index += 1;
        continue;
      }
      return { kind: "invalid" };
    }
    if (pendingDays.length > 0 && slots.length === 0) {
      return { kind: "incomplete", days: [...pendingDays] };
    }
    if (pendingDays.length > 0 || slots.length === 0) {
      return { kind: "invalid" };
    }
    return { kind: "ok", slots };
  }

  private resolveDay(token: string, now: Date): string {
    const today = this.calendar.today(now);
    if (token === "today") {
      return today;
    }
    if (token === "tomorrow") {
      return this.calendar.addDays(today, 1);
    }
    return this.weekdayOnWeek(WEEKDAYS[token]!, 0, now);
  }

  private weekdayOnWeek(weekday: number, weekShift: 0 | 1, now: Date): string {
    const start = this.weeks.startContainingToday(now);
    const shifted = this.calendar.addDays(start, weekShift * 7);
    const offset = (weekday - this.dayOfWeek(shifted) + 7) % 7;
    return this.calendar.addDays(shifted, offset);
  }

  private dayOfWeek(isoDate: string): number {
    return new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  }
}
