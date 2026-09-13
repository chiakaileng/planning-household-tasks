import { TelegramBotApi } from "@/announce/TelegramBotApi";
import { TelegramInboundHandler } from "@/announce/TelegramInboundHandler";
import { TelegramInboundPoller } from "@/announce/TelegramInboundPoller";
import { TelegramRecipePoolWriter } from "@/announce/TelegramRecipePoolWriter";
import { TelegramMemoryOffsetStore } from "@/announce/TelegramUpdateOffsetStore";
import { AppConfig } from "@/config/AppConfig";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import { TelegramDateCaption } from "@/domain/plan/TelegramDateCaption";
import { WeekRange } from "@/domain/plan/WeekRange";
import { TelegramAssignDraftStore } from "@/domain/telegram/TelegramAssignDraftStore";
import { TelegramCallbackCodec } from "@/domain/telegram/TelegramCallback";
import { TelegramCommandParser } from "@/domain/telegram/TelegramCommandParser";
import { TelegramInboundCopy } from "@/domain/telegram/TelegramInboundCopy";
import { TelegramRecipeMethod } from "@/domain/telegram/TelegramRecipeMethod";
import { TelegramSlotCaption } from "@/domain/telegram/TelegramSlotCaption";
import { TelegramWhenParser } from "@/domain/telegram/TelegramWhenParser";
import {
  createImporter,
  createMemberRepository,
  createRecipeRepository,
  createWeekMealPlanner,
} from "@/lib/createImporter";

export function createTelegramInboundPoller(): { poller: TelegramInboundPoller; api: TelegramBotApi } {
  const config = new AppConfig();
  const calendar = new CalendarDate(config.weekTimeZone);
  const weeks = new WeekRange(calendar, config.weekStartsOn);
  const api = new TelegramBotApi(config);
  const handler = new TelegramInboundHandler(
    config,
    api,
    new TelegramCommandParser(),
    new TelegramWhenParser(calendar, weeks),
    new TelegramInboundCopy(),
    new TelegramRecipeMethod(config.telegramMaxMessageChars),
    new TelegramAssignDraftStore(),
    new TelegramCallbackCodec(),
    new TelegramSlotCaption(new TelegramDateCaption(config.weekTimeZone, config.telegramDateLocale)),
    new TelegramRecipePoolWriter(createImporter(), createRecipeRepository()),
    createRecipeRepository(),
    createMemberRepository(),
    createWeekMealPlanner(),
  );
  const poller = new TelegramInboundPoller(
    config,
    api,
    handler,
    new TelegramMemoryOffsetStore(),
  );
  return { poller, api };
}
