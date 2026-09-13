import type { AppConfig } from "@/config/AppConfig";
import type { ITelegramSender, TelegramSendResult } from "@/announce/ITelegramSender";
import { TelegramDateCaption } from "@/domain/plan/TelegramDateCaption";
import { TelegramWeekMessage } from "@/domain/plan/TelegramWeekMessage";
import { WeekRange } from "@/domain/plan/WeekRange";
import type { WeekMealPlanner } from "@/planning/WeekMealPlanner";

export class TelegramAnnouncer {
  private readonly messages: TelegramWeekMessage;

  constructor(
    private readonly config: AppConfig,
    private readonly planner: WeekMealPlanner,
    private readonly sender: ITelegramSender,
    private readonly weeks: WeekRange,
  ) {
    this.messages = new TelegramWeekMessage(
      new TelegramDateCaption(config.weekTimeZone, config.telegramDateLocale),
    );
  }

  async pushWeekly(weekStart: string): Promise<TelegramSendResult> {
    const week = await this.planner.loadWeek(weekStart);
    return this.sender.send(this.messages.week(week.days, week.meals));
  }

  async pushTomorrow(now: Date = new Date()): Promise<TelegramSendResult> {
    const today = this.planner.calendar.today(now);
    const tomorrow = this.planner.calendar.addDays(today, 1);
    const week = await this.planner.loadWeek(this.weeks.startOfWeek(tomorrow), now);
    const dayMeals = week.meals.filter((meal) => meal.date === tomorrow);
    return this.sender.send(this.messages.tomorrow(tomorrow, dayMeals));
  }

  async pushComingWeek(now: Date = new Date()): Promise<TelegramSendResult> {
    return this.pushWeekly(this.weeks.comingWeekStart(now));
  }
}
