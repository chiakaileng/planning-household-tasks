const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Wall-clock parts in the household timezone — schedulers must not use the server zone.
 */
export class AnnounceClock {
  constructor(private readonly timeZone: string) {}

  localDate(now: Date): string {
    const parts = this.parts(now);
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  localWeekday(now: Date): number {
    const weekday = this.parts(now).weekday;
    const index = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
    return index >= 0 ? index : 0;
  }

  localHour(now: Date): number {
    return Number(this.parts(now).hour);
  }

  private parts(now: Date): Record<string, string> {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timeZone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const values: Record<string, string> = {};
    for (const part of formatted) {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    }
    return values;
  }
}
