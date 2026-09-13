import { CalendarDate, formatUtcDate, parseIsoDate } from "@/domain/plan/CalendarDate";

/**
 * A week of calendar dates. weekStartsOn matches Date#getUTCDay (0 Sunday … 6 Saturday).
 */
export class WeekRange {
  constructor(
    private readonly calendar: CalendarDate,
    private readonly weekStartsOn: number,
  ) {}

  startOfWeek(isoDate: string): string {
    const date = parseIsoDate(isoDate);
    const delta = (date.getUTCDay() - this.weekStartsOn + 7) % 7;
    date.setUTCDate(date.getUTCDate() - delta);
    return formatUtcDate(date);
  }

  startContainingToday(now: Date = new Date()): string {
    return this.startOfWeek(this.calendar.today(now));
  }

  /** Week that begins on/after tomorrow — Sunday night announces Mon–Sun, not the week ending today. */
  comingWeekStart(now: Date = new Date()): string {
    return this.startOfWeek(this.calendar.addDays(this.calendar.today(now), 1));
  }

  days(weekStart: string): string[] {
    const start = this.startOfWeek(weekStart);
    return Array.from({ length: 7 }, (_, index) => this.calendar.addDays(start, index));
  }
}
