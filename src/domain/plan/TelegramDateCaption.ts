/**
 * Date lines for Telegram copy. Locale and timezone come from config.
 */
export class TelegramDateCaption {
  constructor(
    private readonly timeZone: string,
    private readonly locale: string,
  ) {}

  weekRange(days: readonly string[]): string {
    const start = days[0] ?? "";
    const end = days[days.length - 1] ?? "";
    const firstDay = this.format(start, { day: "numeric" });
    const lastDay = this.format(end, { day: "numeric" });
    const firstMonth = this.format(start, { month: "short" });
    const lastMonth = this.format(end, { month: "short" });
    if (firstMonth === lastMonth) {
      return `${firstDay}–${lastDay} ${firstMonth}`;
    }
    return `${firstDay} ${firstMonth}–${lastDay} ${lastMonth}`;
  }

  weekday(isoDate: string): string {
    return this.format(isoDate, { weekday: "short" });
  }

  tomorrowHeading(isoDate: string): string {
    return `${this.weekday(isoDate)} ${this.format(isoDate, { day: "numeric" })} ${this.format(isoDate, { month: "short" })}`;
  }

  private format(isoDate: string, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.locale, {
      timeZone: this.timeZone,
      ...options,
    }).format(new Date(`${isoDate}T12:00:00Z`));
  }
}
