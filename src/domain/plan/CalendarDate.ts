/**
 * Calendar dates in a configured timezone. Never use the server’s local zone.
 */
export class CalendarDate {
  constructor(private readonly timeZone: string) {}

  today(now: Date = new Date()): string {
    return this.format(now);
  }

  addDays(isoDate: string, days: number): string {
    const date = parseIsoDate(isoDate);
    date.setUTCDate(date.getUTCDate() + days);
    return formatUtcDate(date);
  }

  private format(instant: Date): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: this.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant);
    return parts;
  }
}

export function parseIsoDate(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`Expected YYYY-MM-DD, got ${isoDate}`);
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
}

export function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
