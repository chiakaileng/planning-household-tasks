import type { AppConfig } from "@/config/AppConfig";
import { AnnounceClock } from "@/announce/AnnounceClock";
import type { TelegramAnnouncer } from "@/announce/TelegramAnnouncer";

/**
 * While the process is up, send Sunday weekly + nightly tomorrow. Missed hours are skipped.
 * One send per local date per kind so a 30s tick does not double-post.
 */
export class TelegramAnnounceScheduler {
  private lastWeeklyDate = "";
  private lastTomorrowDate = "";

  constructor(
    private readonly config: AppConfig,
    private readonly clock: AnnounceClock,
    private readonly announcer: TelegramAnnouncer,
  ) {}

  async tick(now: Date): Promise<void> {
    if (!this.config.hasTelegramCredentials()) {
      return;
    }
    const date = this.clock.localDate(now);
    const weekday = this.clock.localWeekday(now);
    const hour = this.clock.localHour(now);

    if (weekday === this.config.telegramWeeklyWeekday && hour === this.config.telegramWeeklyHour && this.lastWeeklyDate !== date) {
      this.lastWeeklyDate = date;
      await this.announcer.pushComingWeek(now);
    }

    if (hour === this.config.telegramNightBeforeHour && this.lastTomorrowDate !== date) {
      this.lastTomorrowDate = date;
      await this.announcer.pushTomorrow(now);
    }
  }
}
