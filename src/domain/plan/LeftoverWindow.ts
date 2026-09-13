import type { CalendarDate } from "@/domain/plan/CalendarDate";

/** Inclusive window ending on `today`, length from config (seven days means today plus the six before). */
export class LeftoverWindow {
  constructor(
    private readonly calendar: CalendarDate,
    private readonly lookbackDays: number,
  ) {}

  firstDate(today: string): string {
    return this.calendar.addDays(today, -(this.lookbackDays - 1));
  }

  includes(mealDate: string, today: string): boolean {
    return mealDate >= this.firstDate(today) && mealDate <= today;
  }
}
