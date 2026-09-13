import { TelegramAnnouncer } from "@/announce/TelegramAnnouncer";
import { TelegramBotSender } from "@/announce/TelegramBotSender";
import { AppConfig } from "@/config/AppConfig";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import { WeekRange } from "@/domain/plan/WeekRange";
import { createWeekMealPlanner } from "@/lib/createImporter";

export function createTelegramAnnouncer(): TelegramAnnouncer {
  const config = new AppConfig();
  const weeks = new WeekRange(new CalendarDate(config.weekTimeZone), config.weekStartsOn);
  return new TelegramAnnouncer(config, createWeekMealPlanner(), new TelegramBotSender(config), weeks);
}
