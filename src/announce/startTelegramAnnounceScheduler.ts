import { AnnounceClock } from "@/announce/AnnounceClock";
import { TelegramAnnounceScheduler } from "@/announce/TelegramAnnounceScheduler";
import { AppConfig } from "@/config/AppConfig";
import { createTelegramAnnouncer } from "@/lib/createTelegramAnnouncer";

let started = false;

/** One interval for the Node process. Safe to call from instrumentation after a hot reload check. */
export function startTelegramAnnounceScheduler(): void {
  if (started) {
    return;
  }
  started = true;
  const config = new AppConfig();
  const scheduler = new TelegramAnnounceScheduler(
    config,
    new AnnounceClock(config.weekTimeZone),
    createTelegramAnnouncer(),
  );
  void scheduler.tick(new Date());
  setInterval(() => {
    void scheduler.tick(new Date());
  }, config.telegramSchedulerIntervalMs);
}
