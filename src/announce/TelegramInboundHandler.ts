import type { AppConfig } from "@/config/AppConfig";
import type { ITelegramBotApi, TelegramInlineButton, TelegramUpdate } from "@/announce/ITelegramBotApi";
import type { ITelegramRecipePoolWriter } from "@/announce/TelegramRecipePoolWriter";
import type { DishDraft } from "@/domain/plan/DishDraft";
import type { PlannedDish, PlannedMeal } from "@/domain/plan/PlannedMeal";
import type { CalendarDate } from "@/domain/plan/CalendarDate";
import type { WeekRange } from "@/domain/plan/WeekRange";
import { TelegramHtmlText } from "@/domain/plan/TelegramHtmlText";
import { RecipeSearch } from "@/domain/plan/RecipeSearch";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";
import { emptyAssignDraft, type TelegramAssignDraft } from "@/domain/telegram/TelegramAssignDraft";
import { TelegramInterviewLabel } from "@/domain/telegram/TelegramInterviewLabel";
import type { TelegramAssignDraftStore } from "@/domain/telegram/TelegramAssignDraftStore";
import type { TelegramCallback, TelegramCallbackCodec } from "@/domain/telegram/TelegramCallback";
import type { TelegramCommandParser, TelegramSlashCommand } from "@/domain/telegram/TelegramCommandParser";
import type { TelegramInboundCopy } from "@/domain/telegram/TelegramInboundCopy";
import type { TelegramRecipeMethod } from "@/domain/telegram/TelegramRecipeMethod";
import type { TelegramSlotCaption } from "@/domain/telegram/TelegramSlotCaption";
import type { PlannedSlot, TelegramWhenParser } from "@/domain/telegram/TelegramWhenParser";
import type { SavedMember } from "@/domain/member/SavedMember";
import type { IMemberRepository } from "@/persistence/IMemberRepository";
import type { IRecipeRepository } from "@/persistence/IRecipeRepository";

export type TelegramWeekPlanning = {
  calendar: CalendarDate;
  weeks: WeekRange;
  defaultSlots(): readonly { key: string; name: string }[];
  loadWeek(weekStart: string | null, now?: Date): Promise<{
    weekStart: string;
    days: string[];
    today: string;
    meals: PlannedMeal[];
  }>;
  addDish(mealId: string, draft: DishDraft): Promise<PlannedDish>;
  removeDish(dishId: string): Promise<boolean>;
};

/**
 * Commands, taps, and prompt replies in the configured chat. Other chatter is
 * silence. A week dish is written only when the interview finishes.
 */
export class TelegramInboundHandler {
  private readonly html = new TelegramHtmlText();
  private readonly recipeSearch = new RecipeSearch();
  private readonly labels: TelegramInterviewLabel;

  constructor(
    private readonly config: AppConfig,
    private readonly api: ITelegramBotApi,
    private readonly commands: TelegramCommandParser,
    private readonly when: TelegramWhenParser,
    private readonly copy: TelegramInboundCopy,
    private readonly method: TelegramRecipeMethod,
    private readonly drafts: TelegramAssignDraftStore,
    private readonly callbacks: TelegramCallbackCodec,
    private readonly captions: TelegramSlotCaption,
    private readonly pool: ITelegramRecipePoolWriter,
    private readonly recipes: IRecipeRepository,
    private readonly members: IMemberRepository,
    private readonly planner: TelegramWeekPlanning,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.labels = new TelegramInterviewLabel(config.telegramInterviewLabelChars);
  }

  async handle(update: TelegramUpdate): Promise<void> {
    if (update.inlineQuery) {
      await this.handleInline(update.inlineQuery);
      return;
    }
    if (update.callbackQuery) {
      if (update.callbackQuery.chatId !== this.config.telegramChatId) {
        return;
      }
      await this.api.answerCallback(update.callbackQuery.id);
      await this.handleCallback(update.callbackQuery.userId, update.callbackQuery.chatId, update.callbackQuery.data);
      return;
    }
    const message = update.message;
    if (!message || message.isBot) {
      return;
    }
    if (normalizeChatId(message.chatId) !== normalizeChatId(this.config.telegramChatId)) {
      console.info(
        `Telegram inbound: ignored chat ${message.chatId} (configured ${this.config.telegramChatId}).`,
      );
      return;
    }
    await this.handleMessage(message.userId, message.chatId, message.text, message.replyToMessageId);
  }

  private async handleInline(query: { id: string; query: string }): Promise<void> {
    const recipes = await this.filteredRecipes(query.query);
    await this.api.answerInline(
      query.id,
      recipes.slice(0, 20).map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        description: recipe.notes ?? "",
      })),
    );
  }

  private async handleMessage(userId: string, chatId: string, text: string, replyTo: number | null): Promise<void> {
    const command = this.commands.parse(text);
    const existing = this.drafts.get(chatId, userId);
    if (existing && (await this.resumeOpenDraft(existing, command, text, chatId, replyTo))) {
      return;
    }
    if (command.kind === "ignore") {
      return;
    }
    if (existing) {
      this.drafts.clear(chatId, userId);
      await this.api.send({ text: this.copy.notSavedOnMeal });
    }
    if (command.kind === "help") {
      console.info("Telegram inbound: /help");
      const sent = await this.api.send({ text: this.copy.helpHtml(this.html) });
      if (!sent.ok) {
        console.error("Telegram inbound: /help send failed.", sent.error);
      }
      return;
    }
    if (command.kind === "add") {
      await this.startAdd(userId, chatId, command.url, command.rest);
      return;
    }
    if (command.kind === "plan") {
      await this.startPlan(userId, chatId, command.rest);
      return;
    }
    if (command.kind === "free") {
      await this.startFree(userId, chatId, command.rest);
      return;
    }
    if (command.kind === "unplan") {
      await this.startUnplan(userId, chatId, command.rest);
      return;
    }
    await this.startCook(userId, chatId, command.rest);
  }

  /**
   * A second /free while “What is it?” is open is the paste, not a cancel.
   * A long follow-up in a 1:1 is the rest of a split recipe, not chatter.
   */
  private async resumeOpenDraft(
    draft: TelegramAssignDraft,
    command: TelegramSlashCommand,
    text: string,
    chatId: string,
    replyTo: number | null,
  ): Promise<boolean> {
    if (command.kind === "free" && draft.awaiting === "freeform") {
      if (command.rest) {
        await this.startFree(draft.userId, draft.chatId, command.rest);
      }
      return true;
    }
    if (command.kind === "free" && draft.awaiting === "title") {
      if (command.rest) {
        await this.handleReply(draft, command.rest);
      }
      return true;
    }
    if (command.kind === "add" && draft.awaiting === "url") {
      if (command.url || command.rest) {
        await this.startAdd(draft.userId, draft.chatId, command.url, command.rest);
      }
      return true;
    }
    if (command.kind !== "ignore") {
      return false;
    }
    if (isTypedPromptReply(draft.awaiting, chatId, replyTo, draft.promptMessageId)) {
      await this.handleReply(draft, text);
      return true;
    }
    if (this.appendFreeformContinuation(draft, chatId, text)) {
      return true;
    }
    console.info(`Telegram inbound: ignored loose message while awaiting ${draft.awaiting}.`);
    return true;
  }

  private appendFreeformContinuation(draft: TelegramAssignDraft, chatId: string, text: string): boolean {
    if (!isPrivateTelegramChat(chatId) || draft.content?.kind !== "freeform") {
      return false;
    }
    const chunk = text.trim();
    if (!chunk || (!chunk.includes("\n") && chunk.length <= this.config.telegramInterviewLabelChars)) {
      return false;
    }
    draft.content = {
      kind: "freeform",
      text: `${draft.content.text.trim()}\n${chunk}`,
      title: draft.content.title,
    };
    this.drafts.set(draft);
    return true;
  }

  private async handleReply(draft: TelegramAssignDraft, text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      this.drafts.clear(draft.chatId, draft.userId);
      await this.api.send({ text: this.copy.notSaved });
      return;
    }
    if (draft.awaiting === "url") {
      const parsed = this.commands.parse(`/add ${trimmed}`);
      if (parsed.kind !== "add" || !parsed.url) {
        this.drafts.clear(draft.chatId, draft.userId);
        await this.api.send({ text: this.copy.notSaved });
        return;
      }
      await this.startAdd(draft.userId, draft.chatId, parsed.url, parsed.rest);
      return;
    }
    if (draft.awaiting === "freeform") {
      draft.content = { kind: "freeform", text: trimmed, title: null };
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (draft.awaiting === "title" && draft.content?.kind === "freeform") {
      draft.content = {
        ...draft.content,
        title: this.labels.shorten(trimmed),
      };
      this.drafts.set(draft);
      await this.continueInterview(draft);
    }
  }

  private async handleCallback(userId: string, chatId: string, raw: string): Promise<void> {
    const callback = this.callbacks.decode(raw);
    if (!callback) {
      return;
    }
    if (callback.kind === "how") {
      await this.sendMethodById(callback.id);
      return;
    }
    if (callback.kind === "remove") {
      await this.removePlannedDish(callback.id);
      return;
    }
    const draft = this.drafts.get(chatId, userId);
    if (!draft) {
      if (callback.kind === "recipe") {
        await this.sendMethodById(callback.id);
      }
      return;
    }
    if (callback.kind === "cancel") {
      this.drafts.clear(chatId, userId);
      await this.api.send({ text: this.copy.notSavedOnMeal });
      return;
    }
    await this.applyCallback(draft, callback);
  }

  private async applyCallback(draft: TelegramAssignDraft, callback: TelegramCallback): Promise<void> {
    if (callback.kind === "page") {
      draft.page = callback.page;
      this.drafts.set(draft);
      await this.showRecipePicker(draft);
      return;
    }
    if (callback.kind === "something_else") {
      draft.awaiting = "freeform";
      draft.content = null;
      this.drafts.set(draft);
      await this.ask(draft, this.copy.whatIsIt, undefined, true);
      return;
    }
    if (callback.kind === "as_freeform") {
      const text = draft.search.trim();
      if (!text) {
        draft.awaiting = "freeform";
        this.drafts.set(draft);
        await this.ask(draft, this.copy.whatIsIt, undefined, true);
        return;
      }
      draft.content = { kind: "freeform", text, title: null };
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (callback.kind === "save_library") {
      await this.saveFreeformToLibrary(draft);
      return;
    }
    if (callback.kind === "skip_library") {
      draft.libraryAsked = true;
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (callback.kind === "yes") {
      await this.continueInterview(draft);
      return;
    }
    if (callback.kind === "no") {
      this.drafts.clear(draft.chatId, draft.userId);
      await this.api.send({
        text: this.copy.notPutOnMeal(draft.poolLine ?? this.html.escape(this.labels.saveLabel(draft))),
      });
      return;
    }
    if (callback.kind === "recipe") {
      if (draft.pickerKind === "cook") {
        this.drafts.clear(draft.chatId, draft.userId);
        await this.sendMethodById(callback.id);
        return;
      }
      const recipe = await this.recipes.getById(callback.id);
      if (!recipe) {
        this.drafts.clear(draft.chatId, draft.userId);
        await this.api.send({ text: `${this.copy.recipeGone}\n${this.copy.notSavedOnMeal}` });
        return;
      }
      draft.content = { kind: "recipe", recipeId: recipe.id, title: recipe.title, sourceUrl: recipe.sourceUrl };
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (callback.kind === "week") {
      draft.weekShift = callback.shift;
      draft.pendingDay = null;
      this.drafts.set(draft);
      await this.askDay(draft);
      return;
    }
    if (callback.kind === "day") {
      draft.pendingDay = callback.date;
      this.drafts.set(draft);
      await this.askMeal(draft);
      return;
    }
    if (callback.kind === "meal") {
      if (!draft.pendingDay) {
        await this.askDay(draft);
        return;
      }
      draft.slots = [{ date: draft.pendingDay, slotKey: callback.slotKey }];
      draft.pendingDay = null;
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (callback.kind === "eater") {
      draft.eaterIds = toggleId(draft.eaterIds, callback.id);
      this.drafts.set(draft);
      await this.askEaters(draft);
      return;
    }
    if (callback.kind === "everyone") {
      const people = await this.members.list();
      draft.eaterIds = people.map((member) => member.id);
      draft.eatersDone = true;
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (callback.kind === "skip_eaters") {
      draft.eaterIds = [];
      draft.eatersDone = true;
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (callback.kind === "done_eaters") {
      draft.eatersDone = true;
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (callback.kind === "cook") {
      draft.cookId = callback.id;
      draft.cookDone = true;
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (callback.kind === "skip_cook") {
      draft.cookId = null;
      draft.cookDone = true;
      this.drafts.set(draft);
      await this.continueInterview(draft);
    }
  }

  private async startAdd(userId: string, chatId: string, url: string | null, rest: string): Promise<void> {
    if (!url) {
      const draft = emptyAssignDraft(userId, chatId);
      draft.awaiting = "url";
      this.drafts.set(draft);
      await this.ask(draft, this.copy.sendUrl, undefined, true);
      return;
    }
    const written = await this.pool.addFromUrl(url);
    if (written.kind === "failed") {
      await this.api.send({ text: this.html.escape(written.message) });
      return;
    }
    const recipe = written.recipe;
    const poolLine =
      written.kind === "already"
        ? this.copy.alreadyInPool(this.html.recipeTitle(recipe.title, recipe.sourceUrl))
        : written.kind === "link"
          ? this.copy.savedAsLink(this.html.escape(recipe.title))
          : this.copy.addedToPool(this.html.recipeTitle(recipe.title, recipe.sourceUrl));
    const when = this.when.parse(rest, this.now());
    const draft = emptyAssignDraft(userId, chatId);
    draft.content = { kind: "recipe", recipeId: recipe.id, title: recipe.title, sourceUrl: recipe.sourceUrl };
    draft.poolLine = poolLine;
    if (when.kind === "ok") {
      draft.slots = when.slots;
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (when.kind === "invalid" || when.kind === "incomplete") {
      this.drafts.set(draft);
      await this.api.send({ text: `${poolLine}\n${this.copy.whenNotUnderstood()}` });
      await this.askDay(draft);
      return;
    }
    draft.awaiting = "put_on_meal";
    this.drafts.set(draft);
    await this.ask(draft, `${poolLine}\n${this.copy.putOnMeal(recipe.title)}`, [
      [
        { text: "Yes", data: this.callbacks.encode({ kind: "yes" }) },
        { text: "No", data: this.callbacks.encode({ kind: "no" }) },
      ],
    ]);
  }

  private async startPlan(userId: string, chatId: string, rest: string): Promise<void> {
    const { search, when } = this.when.splitSearch(rest, this.now());
    const draft = emptyAssignDraft(userId, chatId);
    draft.search = search;
    draft.pickerKind = "plan";
    if (when.kind === "ok") {
      draft.slots = when.slots;
    }
    this.drafts.set(draft);
    const matches = await this.filteredRecipes(search);
    if (search && matches.length === 1 && when.kind === "ok") {
      const recipe = matches[0]!;
      draft.content = { kind: "recipe", recipeId: recipe.id, title: recipe.title, sourceUrl: recipe.sourceUrl };
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    if (search && matches.length === 0) {
      draft.awaiting = "recipe";
      this.drafts.set(draft);
      await this.ask(draft, this.copy.nothingMatches(search), [
        [{ text: `Add “${search}” as free-form`, data: this.callbacks.encode({ kind: "as_freeform" }) }],
        [this.cancelButton()],
      ]);
      return;
    }
    if (search && matches.length === 1 && when.kind !== "ok") {
      const recipe = matches[0]!;
      draft.content = { kind: "recipe", recipeId: recipe.id, title: recipe.title, sourceUrl: recipe.sourceUrl };
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    await this.showRecipePicker(draft);
  }

  private async startFree(userId: string, chatId: string, rest: string): Promise<void> {
    const { search, when } = this.when.splitSearch(rest, this.now());
    const draft = emptyAssignDraft(userId, chatId);
    if (when.kind === "ok") {
      draft.slots = when.slots;
    }
    if (!search) {
      draft.awaiting = "freeform";
      this.drafts.set(draft);
      await this.ask(draft, this.copy.whatIsIt, undefined, true);
      return;
    }
    draft.content = { kind: "freeform", text: search, title: null };
    this.drafts.set(draft);
    await this.continueInterview(draft);
  }

  private async startUnplan(userId: string, chatId: string, rest: string): Promise<void> {
    const draft = emptyAssignDraft(userId, chatId);
    draft.pickerKind = "unplan";
    const when = this.when.parse(rest, this.now());
    if (when.kind === "ok") {
      draft.slots = when.slots;
    }
    this.drafts.set(draft);
    await this.continueInterview(draft);
  }

  private async showUnplanPicker(slots: PlannedSlot[]): Promise<void> {
    const found: { dish: PlannedDish; slot: PlannedSlot }[] = [];
    for (const slot of slots) {
      const week = await this.planner.loadWeek(this.planner.weeks.startOfWeek(slot.date), this.now());
      const meal = week.meals.find((item) => item.date === slot.date && item.slotKey === slot.slotKey);
      for (const dish of meal?.dishes ?? []) {
        found.push({ dish, slot });
      }
    }
    if (found.length === 0) {
      await this.api.send({ text: this.copy.nothingToRemove });
      return;
    }
    await this.api.send({
      text: this.copy.whichToRemove,
      buttons: found.map((item) => [
        {
          text:
            found.length === 1
              ? item.dish.title
              : `${item.dish.title} · ${this.captions.many([item.slot])}`,
          data: this.callbacks.encode({ kind: "remove", id: item.dish.id }),
        },
      ]),
    });
  }

  private async removePlannedDish(dishId: string): Promise<void> {
    const located = await this.findPlannedDish(dishId);
    const removed = await this.planner.removeDish(dishId);
    if (!removed) {
      await this.api.send({ text: this.copy.alreadyOff });
      return;
    }
    const when = located ? this.captions.many([{ date: located.meal.date, slotKey: located.meal.slotKey }]) : "that meal";
    await this.api.send({
      text: this.copy.removed(located?.dish.title ?? "that dish", when),
    });
  }

  private async findPlannedDish(
    dishId: string,
  ): Promise<{ dish: PlannedDish; meal: PlannedMeal } | null> {
    const origin = this.planner.weeks.startContainingToday(this.now());
    for (const shift of [0, 1, -1]) {
      const start = this.planner.calendar.addDays(origin, shift * 7);
      const week = await this.planner.loadWeek(start, this.now());
      for (const meal of week.meals) {
        const dish = meal.dishes.find((item) => item.id === dishId);
        if (dish) {
          return { dish, meal };
        }
      }
    }
    return null;
  }

  private async startCook(userId: string, chatId: string, rest: string): Promise<void> {
    if (rest) {
      const cookWhen = this.when.parseCookWhen(rest, this.now());
      if (cookWhen.kind === "ok") {
        const label = /^(today|tomorrow)$/i.test(rest)
          ? rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase()
          : this.captions.cookWhen(cookWhen.slots);
        await this.cookFromSlots(cookWhen.slots, label);
        return;
      }
    }
    const matches = await this.filteredRecipes(rest);
    if (rest && matches.length === 1) {
      await this.sendMethod(matches[0]!);
      return;
    }
    if (rest && matches.length === 0) {
      await this.api.send({ text: this.copy.nothingMatches(rest) });
      return;
    }
    const draft = emptyAssignDraft(userId, chatId);
    draft.search = rest;
    draft.pickerKind = "cook";
    draft.awaiting = "recipe";
    this.drafts.set(draft);
    await this.showRecipePicker(draft);
  }

  private async cookFromSlots(slots: PlannedSlot[], whenLabel: string): Promise<void> {
    const recipes: SavedRecipe[] = [];
    const seen = new Set<string>();
    for (const slot of slots) {
      const week = await this.planner.loadWeek(this.planner.weeks.startOfWeek(slot.date), this.now());
      const meal = week.meals.find((item) => item.date === slot.date && item.slotKey === slot.slotKey);
      for (const dish of meal?.dishes ?? []) {
        if (dish.contentType !== "recipe" || !dish.recipeId || seen.has(dish.recipeId)) {
          continue;
        }
        const recipe = await this.recipes.getById(dish.recipeId);
        if (recipe) {
          seen.add(recipe.id);
          recipes.push(recipe);
        }
      }
    }
    if (recipes.length === 0) {
      await this.api.send({ text: this.copy.noRecipeToCook(whenLabel) });
      return;
    }
    if (recipes.length === 1) {
      await this.sendMethod(recipes[0]!);
      return;
    }
    await this.api.send({
      text: this.copy.whichRecipe(),
      buttons: recipes.map((recipe) => [
        { text: recipe.title, data: this.callbacks.encode({ kind: "how", id: recipe.id }) },
      ]),
    });
  }

  private async continueInterview(draft: TelegramAssignDraft): Promise<void> {
    if (draft.pickerKind === "unplan") {
      if (draft.slots.length === 0) {
        if (draft.pendingDay) {
          await this.askMeal(draft);
          return;
        }
        await this.askDay(draft);
        return;
      }
      await this.showUnplanPicker(draft.slots);
      return;
    }
    if (!draft.content) {
      await this.showRecipePicker(draft);
      return;
    }
    if (draft.content.kind === "freeform" && !draft.content.title) {
      await this.askTitle(draft);
      return;
    }
    if (draft.content.kind === "freeform" && !draft.libraryAsked) {
      await this.askLibrary(draft);
      return;
    }
    if (draft.slots.length === 0) {
      if (draft.pendingDay) {
        await this.askMeal(draft);
        return;
      }
      await this.askDay(draft);
      return;
    }
    const people = await this.members.list();
    if (people.length === 0) {
      draft.eatersDone = true;
      draft.cookDone = true;
      this.drafts.set(draft);
      await this.saveDraft(draft, people);
      return;
    }
    if (!draft.eatersDone) {
      await this.askEaters(draft);
      return;
    }
    if (!draft.cookDone) {
      await this.askCook(draft, people);
      return;
    }
    await this.saveDraft(draft, people);
  }

  private async saveDraft(draft: TelegramAssignDraft, people: readonly SavedMember[]): Promise<void> {
    if (!draft.content || draft.slots.length === 0) {
      this.drafts.clear(draft.chatId, draft.userId);
      await this.api.send({ text: this.copy.notSavedOnMeal });
      return;
    }
    if (draft.content.kind === "recipe") {
      const recipe = await this.recipes.getById(draft.content.recipeId);
      if (!recipe) {
        this.drafts.clear(draft.chatId, draft.userId);
        await this.api.send({ text: `${this.copy.recipeGone}\n${this.copy.notSavedOnMeal}` });
        return;
      }
    }
    const dish = this.toDishDraft(draft);
    const written: PlannedDish[] = [];
    try {
      for (const slot of draft.slots) {
        const week = await this.planner.loadWeek(this.planner.weeks.startOfWeek(slot.date), this.now());
        const meal = week.meals.find((item) => item.date === slot.date && item.slotKey === slot.slotKey);
        if (!meal) {
          this.drafts.clear(draft.chatId, draft.userId);
          await this.api.send({ text: this.copy.notSavedOnMeal });
          return;
        }
        written.push(await this.planner.addDish(meal.id, dish));
      }
    } catch {
      this.drafts.clear(draft.chatId, draft.userId);
      await this.api.send({ text: this.copy.notSavedOnMeal });
      return;
    }
    const eaterNames = draft.eaterIds
      .map((id) => people.find((member) => member.id === id)?.name ?? "")
      .filter(Boolean);
    const cookName = draft.cookId ? (people.find((member) => member.id === draft.cookId)?.name ?? null) : null;
    const titleHtml =
      draft.content.kind === "recipe"
        ? this.html.recipeTitle(draft.content.title, draft.content.sourceUrl)
        : this.html.escape(this.labels.saveLabel(draft));
    const assigned = this.copy.assigned({
      whenLabel: this.captions.many(draft.slots),
      titleHtml,
      eaterNames,
      cookName,
      noMembers: people.length === 0,
    });
    const text = draft.poolLine ? `${draft.poolLine}\n${assigned}` : assigned;
    const buttons: TelegramInlineButton[][] = [];
    if (draft.content.kind === "recipe") {
      buttons.push([{ text: "How to cook", data: this.callbacks.encode({ kind: "how", id: draft.content.recipeId }) }]);
    }
    for (const [index, saved] of written.entries()) {
      const slot = draft.slots[index];
      const label =
        written.length === 1 ? "Remove" : `Remove · ${slot ? this.captions.many([slot]) : "meal"}`;
      buttons.push([{ text: label, data: this.callbacks.encode({ kind: "remove", id: saved.id }) }]);
    }
    this.drafts.clear(draft.chatId, draft.userId);
    await this.api.send({ text, buttons: buttons.length > 0 ? buttons : undefined });
  }

  private toDishDraft(draft: TelegramAssignDraft): DishDraft {
    if (draft.content?.kind === "recipe") {
      return {
        contentType: "recipe",
        recipeId: draft.content.recipeId,
        sourceMealId: null,
        sourceDishId: null,
        leftoverText: null,
        freeformText: null,
        cookMemberId: draft.cookId ?? "",
        eaterMemberIds: draft.eaterIds,
      };
    }
    return {
      contentType: "freeform",
      recipeId: null,
      sourceMealId: null,
      sourceDishId: null,
      leftoverText: null,
      freeformText: draft.content?.kind === "freeform" ? draft.content.text : "",
      freeformTitle: draft.content?.kind === "freeform" ? draft.content.title : null,
      cookMemberId: draft.cookId ?? "",
      eaterMemberIds: draft.eaterIds,
    };
  }

  private async askTitle(draft: TelegramAssignDraft): Promise<void> {
    draft.awaiting = "title";
    this.drafts.set(draft);
    await this.ask(draft, this.copy.whatToCallIt, undefined, true);
  }

  private async askLibrary(draft: TelegramAssignDraft): Promise<void> {
    draft.awaiting = "library";
    this.drafts.set(draft);
    await this.ask(draft, this.copy.saveToLibrary, [
      [
        { text: "Yes", data: this.callbacks.encode({ kind: "save_library" }) },
        { text: "No", data: this.callbacks.encode({ kind: "skip_library" }) },
      ],
      [this.cancelButton()],
    ]);
  }

  private async saveFreeformToLibrary(draft: TelegramAssignDraft): Promise<void> {
    if (draft.content?.kind !== "freeform" || !draft.content.title) {
      draft.libraryAsked = true;
      this.drafts.set(draft);
      await this.continueInterview(draft);
      return;
    }
    const written = await this.pool.addFromPaste(draft.content.title, draft.content.text);
    draft.libraryAsked = true;
    if (written.kind === "failed") {
      this.drafts.set(draft);
      await this.api.send({ text: `${this.html.escape(written.message)}\n${this.copy.notAddedToLibrary}` });
      await this.continueInterview(draft);
      return;
    }
    const recipe = written.recipe;
    draft.content = {
      kind: "recipe",
      recipeId: recipe.id,
      title: recipe.title,
      sourceUrl: recipe.sourceUrl,
    };
    draft.poolLine =
      written.kind === "already"
        ? this.copy.alreadyInLibrary(this.html.recipeTitle(recipe.title, recipe.sourceUrl))
        : this.copy.addedToLibrary(this.html.recipeTitle(recipe.title, recipe.sourceUrl));
    this.drafts.set(draft);
    await this.continueInterview(draft);
  }

  private async showRecipePicker(draft: TelegramAssignDraft): Promise<void> {
    const matches = await this.filteredRecipes(draft.search);
    const pageSize = this.config.telegramPickerPageSize;
    const page = matches.slice(draft.page * pageSize, draft.page * pageSize + pageSize);
    const buttons: TelegramInlineButton[][] = page.map((recipe) => [
      { text: recipe.title, data: this.callbacks.encode({ kind: "recipe", id: recipe.id }) },
    ]);
    const nav: TelegramInlineButton[] = [{ text: "Search", switchInline: draft.search }];
    if (draft.page > 0) {
      nav.push({ text: "Prev", data: this.callbacks.encode({ kind: "page", page: draft.page - 1 }) });
    }
    if ((draft.page + 1) * pageSize < matches.length) {
      nav.push({ text: "Next", data: this.callbacks.encode({ kind: "page", page: draft.page + 1 }) });
    }
    buttons.push(nav);
    if (draft.pickerKind === "plan") {
      buttons.push([{ text: "Something else", data: this.callbacks.encode({ kind: "something_else" }) }]);
    }
    buttons.push([this.cancelButton()]);
    const heading = draft.search
      ? matches.length === 0
        ? this.copy.nothingMatches(draft.search)
        : this.copy.matches(draft.search)
      : this.copy.pickRecipe(matches.length > 0);
    draft.awaiting = "recipe";
    this.drafts.set(draft);
    await this.ask(draft, heading, buttons);
  }

  private async askDay(draft: TelegramAssignDraft): Promise<void> {
    const start = this.planner.calendar.addDays(this.planner.weeks.startContainingToday(this.now()), draft.weekShift * 7);
    const days = this.planner.weeks.days(start);
    const buttons: TelegramInlineButton[][] = [
      days.map((day) => ({
        text: this.captions.day(day),
        data: this.callbacks.encode({ kind: "day", date: day }),
      })),
      [
        draft.weekShift === 0
          ? { text: "Next week", data: this.callbacks.encode({ kind: "week", shift: 1 }) }
          : { text: "This week", data: this.callbacks.encode({ kind: "week", shift: 0 }) },
        this.cancelButton(),
      ],
    ];
    draft.awaiting = "day";
    this.drafts.set(draft);
    await this.ask(draft, this.copy.whichDay(this.labels.promptTitle(draft)), buttons);
  }

  private async askMeal(draft: TelegramAssignDraft): Promise<void> {
    const dayLabel = draft.pendingDay ? this.captions.day(draft.pendingDay) : "";
    const buttons: TelegramInlineButton[][] = [
      this.planner.defaultSlots().map((slot) => ({
        text: slot.name,
        data: this.callbacks.encode({ kind: "meal", slotKey: slot.key }),
      })),
      [this.cancelButton()],
    ];
    draft.awaiting = "meal";
    this.drafts.set(draft);
    await this.ask(draft, this.copy.whichMeal(this.labels.promptTitle(draft), dayLabel), buttons);
  }

  private async askEaters(draft: TelegramAssignDraft): Promise<void> {
    const people = await this.members.list();
    const buttons: TelegramInlineButton[][] = people.map((member) => [
      {
        text: `${draft.eaterIds.includes(member.id) ? "✓ " : ""}${member.name}`,
        data: this.callbacks.encode({ kind: "eater", id: member.id }),
      },
    ]);
    buttons.push([
      { text: "Done", data: this.callbacks.encode({ kind: "done_eaters" }) },
      { text: "Everyone", data: this.callbacks.encode({ kind: "everyone" }) },
      { text: "Skip", data: this.callbacks.encode({ kind: "skip_eaters" }) },
      this.cancelButton(),
    ]);
    const text = this.copy.whoEats(this.labels.promptTitle(draft), this.captions.many(draft.slots));
    const canEdit = draft.awaiting === "eaters" && draft.promptMessageId !== null;
    draft.awaiting = "eaters";
    this.drafts.set(draft);
    if (canEdit && draft.promptMessageId !== null) {
      const edited = await this.api.edit(draft.promptMessageId, { text, buttons });
      if (edited.ok) {
        return;
      }
    }
    await this.ask(draft, text, buttons);
  }

  private async askCook(draft: TelegramAssignDraft, people: readonly SavedMember[]): Promise<void> {
    const buttons: TelegramInlineButton[][] = people.map((member) => [
      { text: member.name, data: this.callbacks.encode({ kind: "cook", id: member.id }) },
    ]);
    buttons.push([
      { text: "Skip", data: this.callbacks.encode({ kind: "skip_cook" }) },
      this.cancelButton(),
    ]);
    draft.awaiting = "cook";
    this.drafts.set(draft);
    await this.ask(draft, this.copy.whoCooks(this.labels.promptTitle(draft), this.captions.many(draft.slots)), buttons);
  }

  private async sendMethodById(id: string): Promise<void> {
    const recipe = await this.recipes.getById(id);
    if (!recipe) {
      await this.api.send({ text: this.copy.recipeGone });
      return;
    }
    await this.sendMethod(recipe);
  }

  private async sendMethod(recipe: SavedRecipe): Promise<void> {
    for (const chunk of this.method.chunks(recipe)) {
      await this.api.send({ text: chunk });
    }
  }

  private async filteredRecipes(query: string): Promise<SavedRecipe[]> {
    const listed = await this.recipes.list();
    const filtered = this.recipeSearch.filter(listed, query);
    return filtered.slice().sort((left, right) => left.title.localeCompare(right.title));
  }

  private async ask(
    draft: TelegramAssignDraft,
    text: string,
    buttons?: TelegramInlineButton[][],
    forceReply = false,
  ): Promise<void> {
    const sent = await this.api.send({ text, buttons, forceReply });
    draft.promptMessageId = sent.ok ? sent.messageId : null;
    this.drafts.set(draft);
  }

  private cancelButton(): TelegramInlineButton {
    return { text: "Cancel", data: this.callbacks.encode({ kind: "cancel" }) };
  }
}

function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function normalizeChatId(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

/** Private chats have a positive user id. Groups and channels are negative. */
function isPrivateTelegramChat(chatId: string): boolean {
  return !normalizeChatId(chatId).startsWith("-");
}

function isTypedPrompt(awaiting: TelegramAssignDraft["awaiting"]): boolean {
  return awaiting === "url" || awaiting === "freeform" || awaiting === "title";
}

/**
 * Group chatter stays ignored unless it is a reply to the prompt. A 1:1 can
 * answer “What is it?” / “Send the recipe URL” with the next line — Telegram
 * force-reply often does not attach in a private chat.
 */
function isTypedPromptReply(
  awaiting: TelegramAssignDraft["awaiting"],
  chatId: string,
  replyTo: number | null,
  promptMessageId: number | null,
): boolean {
  if (!isTypedPrompt(awaiting)) {
    return false;
  }
  if (replyTo !== null && replyTo === promptMessageId) {
    return true;
  }
  return isPrivateTelegramChat(chatId);
}
