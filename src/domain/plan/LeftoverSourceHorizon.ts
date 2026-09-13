import type { LeftoverWindow } from "@/domain/plan/LeftoverWindow";
import type { WeekRange } from "@/domain/plan/WeekRange";

/**
 * Meals you can leftover from: lookback from today through the end of next week.
 */
export class LeftoverSourceHorizon {
  constructor(
    private readonly leftovers: LeftoverWindow,
    private readonly weeks: WeekRange,
  ) {}

  range(today: string): { from: string; to: string } {
    const thisStart = this.weeks.startOfWeek(today);
    return {
      from: this.leftovers.firstDate(today),
      to: this.weeks.lastDay(this.weeks.nextWeekStart(thisStart)),
    };
  }
}
