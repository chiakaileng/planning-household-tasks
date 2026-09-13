import { describe, expect, it } from "vitest";
import { AppConfig } from "@/config/AppConfig";
import type { ITelegramBotApi, TelegramSendRequest, TelegramUpdate } from "@/announce/ITelegramBotApi";
import { TelegramInboundHandler } from "@/announce/TelegramInboundHandler";
import type { ITelegramRecipePoolWriter, PoolWriteResult } from "@/announce/TelegramRecipePoolWriter";
import type { DishDraft } from "@/domain/plan/DishDraft";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import type { PlannedDish, PlannedMeal } from "@/domain/plan/PlannedMeal";
import { TelegramDateCaption } from "@/domain/plan/TelegramDateCaption";
import { WeekRange } from "@/domain/plan/WeekRange";
import { emptyRecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";
import type { SavedMember } from "@/domain/member/SavedMember";
import { TelegramAssignDraftStore } from "@/domain/telegram/TelegramAssignDraftStore";
import { TelegramCallbackCodec } from "@/domain/telegram/TelegramCallback";
import { TelegramCommandParser } from "@/domain/telegram/TelegramCommandParser";
import { TelegramInboundCopy } from "@/domain/telegram/TelegramInboundCopy";
import { TelegramRecipeMethod } from "@/domain/telegram/TelegramRecipeMethod";
import { TelegramSlotCaption } from "@/domain/telegram/TelegramSlotCaption";
import { TelegramWhenParser } from "@/domain/telegram/TelegramWhenParser";
import type { IMemberRepository } from "@/persistence/IMemberRepository";
import type { DuplicateWarning, IRecipeRepository, RecipeListQuery } from "@/persistence/IRecipeRepository";
import { defaultMealSlots } from "@/config/weekMeals";

const CHAT = "-1001";
const OTHER = "-2002";
const NOW = new Date("2026-09-13T12:00:00+08:00");

function testConfig(chatId = CHAT) {
  return new AppConfig({
    GEMINI_API_KEY: "test-key",
    LLM_BASE_URL: "https://example.test/v1beta",
    LLM_MODEL: "test-model",
    LLM_INPUT_PRICE_PER_MILLION_USD: "0.30",
    LLM_OUTPUT_PRICE_PER_MILLION_USD: "2.50",
    PAGE_FETCH_TIMEOUT_MS: "1000",
    PAGE_FETCH_USER_AGENT: "test-agent",
    DATABASE_URL: "file:./dev.db",
    WEEK_TIMEZONE: "Asia/Singapore",
    WEEK_STARTS_ON: "1",
    LEFTOVER_LOOKBACK_DAYS: "7",
    TELEGRAM_BOT_TOKEN: "token",
    TELEGRAM_CHAT_ID: chatId,
    TELEGRAM_PICKER_PAGE_SIZE: "5",
  });
}

function recipe(id: string, title: string, extras: Partial<SavedRecipe> = {}): SavedRecipe {
  return {
    id,
    title,
    servings: 2,
    ingredients: [{ name: "salt", quantity: "1", unit: "pinch", note: null, parseFlagged: false }],
    steps: ["Taste."],
    sourceType: "url",
    sourceUrl: `https://example.test/${id}`,
    sourceText: null,
    notes: null,
    tags: [],
    emojis: [],
    ...emptyRecipeNutrition(),
    ...extras,
  };
}

function member(id: string, name: string): SavedMember {
  return { id, name, lifeStage: "adult", avatarMode: "initials", avatarPresetKey: null };
}

class FakeApi implements ITelegramBotApi {
  sent: TelegramSendRequest[] = [];
  edits: { messageId: number; request: TelegramSendRequest }[] = [];
  async send(request: TelegramSendRequest) {
    this.sent.push(request);
    return { ok: true as const, messageId: this.sent.length };
  }
  async edit(messageId: number, request: TelegramSendRequest) {
    this.edits.push({ messageId, request });
    return { ok: true as const, messageId };
  }
  async answerCallback(): Promise<void> {}
  async answerInline(): Promise<void> {}
  async getUpdates(): Promise<null> {
    return null;
  }
  async setMyCommands(): Promise<void> {}
  async deleteWebhook(): Promise<void> {}
}

class FakeRecipes implements IRecipeRepository {
  constructor(public items: SavedRecipe[]) {}
  async save(draft: RecipeDraft): Promise<SavedRecipe> {
    return recipe("new", draft.title);
  }
  async findDuplicate(): Promise<DuplicateWarning | null> {
    return null;
  }
  async list(_query?: RecipeListQuery): Promise<SavedRecipe[]> {
    return this.items;
  }
  async getById(id: string): Promise<SavedRecipe | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async updateNotesAndTags(): Promise<SavedRecipe | null> {
    return null;
  }
  async update(): Promise<SavedRecipe | null> {
    return null;
  }
  async remove(): Promise<boolean> {
    return false;
  }
}

class FakeMembers implements IMemberRepository {
  constructor(public items: SavedMember[]) {}
  async list(): Promise<SavedMember[]> {
    return this.items;
  }
  async getById(id: string): Promise<SavedMember | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async findDuplicateName() {
    return null;
  }
  async create(): Promise<SavedMember> {
    throw new Error("unused");
  }
  async update(): Promise<SavedMember | null> {
    return null;
  }
  async remove(): Promise<boolean> {
    return false;
  }
}

class FakePlanner {
  calendar = new CalendarDate("Asia/Singapore");
  weeks = new WeekRange(this.calendar, 1);
  added: { mealId: string; draft: DishDraft }[] = [];
  removed: string[] = [];
  seeded: PlannedDish[] = [];

  defaultSlots() {
    return defaultMealSlots;
  }

  async loadWeek(weekStart: string | null) {
    const start = this.weeks.startOfWeek(weekStart ?? "2026-09-07");
    const days = this.weeks.days(start);
    const meals: PlannedMeal[] = days.flatMap((date) =>
      defaultMealSlots.map((slot) => ({
        id: `${date}:${slot.key}`,
        date,
        slotKey: slot.key,
        name: slot.name,
        sortOrder: slot.sortOrder,
        isExtra: false,
        dishes: this.dishesOn(`${date}:${slot.key}`),
      })),
    );
    return { weekStart: start, days, today: "2026-09-13", meals };
  }

  async addDish(mealId: string, draft: DishDraft): Promise<PlannedDish> {
    this.added.push({ mealId, draft });
    const dish: PlannedDish = {
      id: `dish-${this.added.length}`,
      mealId,
      contentType: draft.contentType,
      recipeId: draft.recipeId,
      recipeMissing: false,
      sourceUrl: null,
      sourceMealId: null,
      sourceDishId: null,
      leftoverText: null,
      freeformText: draft.freeformText,
      title: draft.freeformTitle?.trim() || draft.freeformText?.split(/\r?\n/, 1)[0] || "Recipe",
      cookMemberId: draft.cookMemberId || null,
      cookName: "",
      eaters: [],
      sortOrder: 0,
    };
    this.seeded.push(dish);
    return dish;
  }

  async removeDish(dishId: string): Promise<boolean> {
    const known =
      this.added.some((_, index) => `dish-${index + 1}` === dishId) || this.seeded.some((dish) => dish.id === dishId);
    if (!known) {
      return false;
    }
    this.removed.push(dishId);
    this.seeded = this.seeded.filter((dish) => dish.id !== dishId);
    return true;
  }

  private dishesOn(mealId: string): PlannedDish[] {
    return this.seeded.filter((dish) => dish.mealId === mealId);
  }
}

function setup(options?: {
  recipes?: SavedRecipe[];
  members?: SavedMember[];
  pool?: PoolWriteResult;
  chatId?: string;
}) {
  const soup = recipe("soup", "Tomato soup");
  const pasta = recipe("pasta", "Pasta");
  const api = new FakeApi();
  const planner = new FakePlanner();
  const poolResult = options?.pool ?? { kind: "added" as const, recipe: soup };
  const listed = new FakeRecipes(options?.recipes ?? [soup, pasta]);
  const pool: ITelegramRecipePoolWriter = {
    addFromUrl: async () => poolResult,
    addFromPaste: async (title, text) => {
      const saved = recipe(`paste-${title}`, title, { sourceText: text, steps: [text] });
      listed.items.push(saved);
      return { kind: "added", recipe: saved };
    },
  };
  const handler = new TelegramInboundHandler(
    testConfig(options?.chatId),
    api,
    new TelegramCommandParser(),
    new TelegramWhenParser(planner.calendar, planner.weeks),
    new TelegramInboundCopy(),
    new TelegramRecipeMethod(4096),
    new TelegramAssignDraftStore(),
    new TelegramCallbackCodec(),
    new TelegramSlotCaption(new TelegramDateCaption("Asia/Singapore", "en-SG")),
    pool,
    listed,
    new FakeMembers(options?.members ?? [member("ada", "Ada"), member("kai", "Kai")]),
    planner,
    () => NOW,
  );
  return { api, handler, planner, soup, pasta };
}

function message(text: string, overrides: Partial<TelegramUpdate["message"]> = {}): TelegramUpdate {
  return {
    updateId: 1,
    message: {
      messageId: 10,
      chatId: CHAT,
      userId: "9",
      text,
      isBot: false,
      replyToMessageId: null,
      ...overrides,
    },
  };
}

async function nameDish(
  handler: TelegramInboundHandler,
  api: FakeApi,
  title = "Pizza",
  overrides: Partial<TelegramUpdate["message"]> = {},
) {
  await handler.handle(message(title, { replyToMessageId: api.sent.length, ...overrides }));
}

async function keepOffLibrary(handler: TelegramInboundHandler) {
  await handler.handle(tap("ln"));
}

function tap(data: string): TelegramUpdate {
  return {
    updateId: 2,
    callbackQuery: { id: "cb", chatId: CHAT, userId: "9", data },
  };
}

describe("TelegramInboundHandler", () => {
  it("ignores chatter, other chats, and bot messages", async () => {
    const { api, handler } = setup();
    await handler.handle(message("https://example.test/r"));
    await handler.handle(message("/add https://example.test/r", { chatId: OTHER }));
    await handler.handle(message("/add https://example.test/r", { isBot: true }));
    expect(api.sent).toEqual([]);
    expect(handler).toBeTruthy();
  });

  it("sends /help with angle brackets escaped for Telegram HTML", async () => {
    const { api, handler } = setup();
    await handler.handle(message("/help"));
    expect(api.sent).toHaveLength(1);
    expect(api.sent[0]!.text).toContain("Add recipes to your recipe library");
    expect(api.sent[0]!.text).toContain("<code>/add &lt;recipe url&gt;</code>");
    expect(api.sent[0]!.text).not.toContain("/add <recipe url>");
  });

  it("imports /add url without writing a meal until they say yes", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/add https://example.test/soup"));
    expect(planner.added).toEqual([]);
    expect(api.sent.at(-1)?.text).toContain("Added to the pool");
    expect(api.sent.at(-1)?.text).toContain("Put Tomato soup on a meal?");
  });

  it("asks who eats after /add url fri dinner and does not write yet", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/add https://example.test/soup fri dinner"));
    expect(planner.added).toEqual([]);
    expect(api.sent.at(-1)?.text).toContain("who eats?");
    expect(api.sent.at(-1)?.text).toContain("Fri dinner");
    expect(api.sent.at(-1)?.buttons?.flat().map((button) => button.text)).toContain("Done");
  });

  it("moves on from eaters after Done and does not resend the prompt", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/free pizza fri dinner"));
    await nameDish(handler, api);
    await keepOffLibrary(handler);
    const before = api.sent.length;
    await handler.handle(tap("e:ada"));
    expect(api.sent).toHaveLength(before);
    expect(api.edits.at(-1)?.request.buttons?.flat().map((button) => button.text)).toContain("✓ Ada");
    await handler.handle(tap("ed"));
    expect(planner.added).toEqual([]);
    expect(api.sent.at(-1)?.text).toContain("who cooks?");
    await handler.handle(tap("ks"));
    expect(planner.added).toHaveLength(1);
    expect(planner.added[0]?.draft.eaterMemberIds).toEqual(["ada"]);
  });

  it("keeps interview prompts to the first line of a long free-form", async () => {
    const { api, handler } = setup();
    await handler.handle(message("/free"));
    await handler.handle(message("pizza\n1 cup flour\n2 eggs", { replyToMessageId: 1 }));
    expect(api.sent.at(-1)?.text).toBe("What should we call it? Reply to this message.");
    await nameDish(handler, api, "Friday pizza");
    expect(api.sent.at(-1)?.text).toBe("Save this to the recipe library?");
    await keepOffLibrary(handler);
    expect(api.sent.at(-1)?.text).toBe("Friday pizza — which day?");
    expect(api.sent.at(-1)?.text).not.toContain("1 cup flour");
  });

  it("writes after skip eaters and skip cook", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/add https://example.test/soup fri dinner"));
    await handler.handle(tap("es"));
    expect(planner.added).toEqual([]);
    await handler.handle(tap("ks"));
    expect(planner.added).toHaveLength(1);
    expect(planner.added[0]?.mealId).toBe("2026-09-11:dinner");
    expect(api.sent.at(-1)?.text).toContain("no eaters or cook yet");
    expect(api.sent.at(-1)?.buttons?.flat().map((button) => button.text)).toEqual(
      expect.arrayContaining(["How to cook", "Remove"]),
    );
  });

  it("removes a dish from the confirmation button", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/add https://example.test/soup fri dinner"));
    await handler.handle(tap("es"));
    await handler.handle(tap("ks"));
    await handler.handle(tap("u:dish-1"));
    expect(planner.removed).toEqual(["dish-1"]);
    expect(api.sent.at(-1)?.text).toContain("Removed");
  });

  it("lists dishes for /unplan fri dinner", async () => {
    const { api, handler, planner } = setup();
    planner.seeded.push({
      id: "seed-1",
      mealId: "2026-09-11:dinner",
      contentType: "freeform",
      recipeId: null,
      recipeMissing: false,
      sourceUrl: null,
      sourceMealId: null,
      sourceDishId: null,
      leftoverText: null,
      freeformText: "Pizza",
      title: "Pizza",
      cookMemberId: null,
      cookName: "",
      eaters: [],
      sortOrder: 0,
    });
    await handler.handle(message("/unplan fri dinner"));
    expect(api.sent.at(-1)?.text).toBe("Which dish to remove?");
    expect(api.sent.at(-1)?.buttons?.flat().map((button) => button.text)).toContain("Pizza");
  });

  it("puts the same recipe on fri sat dinner", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/free pizza fri sat dinner"));
    await nameDish(handler, api);
    await keepOffLibrary(handler);
    await handler.handle(tap("es"));
    await handler.handle(tap("ks"));
    expect(planner.added.map((row) => row.mealId)).toEqual(["2026-09-11:dinner", "2026-09-12:dinner"]);
  });

  it("understands next tue", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/free pizza next tue dinner"));
    await nameDish(handler, api);
    await keepOffLibrary(handler);
    await handler.handle(tap("es"));
    await handler.handle(tap("ks"));
    expect(planner.added[0]?.mealId).toBe("2026-09-15:dinner");
  });

  it("shows the pool picker for /plan and something else", async () => {
    const { api, handler } = setup();
    await handler.handle(message("/plan"));
    const last = api.sent.at(-1);
    expect(last?.text).toBe("Pick a recipe, or something else");
    expect(last?.buttons?.flat().map((button) => button.text)).toContain("Something else");
    expect(last?.buttons?.flat().map((button) => button.text)).toContain("Tomato soup");
  });

  it("filters /plan search and keeps several hits on the picker", async () => {
    const { api, handler } = setup({
      recipes: [recipe("a", "Tomato soup"), recipe("b", "Tomato pasta")],
    });
    await handler.handle(message("/plan tomato fri dinner"));
    expect(api.sent.at(-1)?.text).toBe("Matches for “tomato”");
    expect(api.sent.at(-1)?.buttons?.flat().map((button) => button.text)).toEqual(
      expect.arrayContaining(["Tomato soup", "Tomato pasta"]),
    );
  });

  it("offers free-form when search matches nothing", async () => {
    const { api, handler } = setup();
    await handler.handle(message("/plan takeaway noodles"));
    expect(api.sent.at(-1)?.text).toBe("Nothing in the pool matches “takeaway noodles”.");
    expect(api.sent.at(-1)?.buttons?.flat().map((button) => button.text)).toContain(
      "Add “takeaway noodles” as free-form",
    );
  });

  it("does not save empty free-form", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/free"));
    await handler.handle(message("   ", { replyToMessageId: 1 }));
    expect(planner.added).toEqual([]);
    expect(api.sent.at(-1)?.text).toBe("Not saved.");
  });

  it("ignores a loose free-form line in a group unless it is a reply", async () => {
    const { api, handler } = setup();
    await handler.handle(message("/free"));
    await handler.handle(message("takeaway noodles"));
    expect(api.sent.at(-1)?.text).toBe("What is it? Reply to this message.");
  });

  it("does not cancel when they send /free again while answering what it is", async () => {
    const { api, handler } = setup();
    await handler.handle(message("/free"));
    await handler.handle(message("/free"));
    expect(api.sent.filter((item) => item.text === "Not saved on a meal.")).toEqual([]);
    expect(api.sent.filter((item) => item.text === "What is it? Reply to this message.")).toHaveLength(1);
    await handler.handle(message("/free pizza"));
    expect(api.sent.at(-1)?.text).toBe("What should we call it? Reply to this message.");
  });

  it("saves a free-form paste to the recipe library only when they say yes", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/free 1 cup flour\n2 eggs fri dinner"));
    await nameDish(handler, api, "Friday pizza");
    await handler.handle(tap("ly"));
    await handler.handle(tap("es"));
    await handler.handle(tap("ks"));
    expect(planner.added[0]?.draft.contentType).toBe("recipe");
    expect(planner.added[0]?.draft.recipeId).toBe("paste-Friday pizza");
    expect(api.sent.at(-1)?.text).toContain("Saved to the recipe library");
    expect(api.sent.at(-1)?.buttons?.[0]?.[0]?.text).toBe("How to cook");
  });

  it("saves the typed title, not the free-form paste", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/free 1 cup flour\n2 eggs fri dinner"));
    expect(api.sent.at(-1)?.text).toBe("What should we call it? Reply to this message.");
    await nameDish(handler, api, "Friday pizza");
    await keepOffLibrary(handler);
    await handler.handle(tap("es"));
    await handler.handle(tap("ks"));
    expect(planner.added[0]?.draft.freeformTitle).toBe("Friday pizza");
    expect(planner.added[0]?.draft.freeformText).toContain("1 cup flour");
    expect(api.sent.at(-1)?.text).toContain("Friday pizza");
    expect(api.sent.at(-1)?.text).not.toContain("1 cup flour");
  });

  it("takes the next line as free-form in a private chat", async () => {
    const chatId = "292111111";
    const { api, handler } = setup({ chatId });
    await handler.handle(message("/free", { chatId }));
    await handler.handle(message("takeaway noodles", { chatId }));
    expect(api.sent.at(-1)?.text).toBe("What should we call it? Reply to this message.");
    await nameDish(handler, api, "Noodles", { chatId });
    expect(api.sent.at(-1)?.text).toBe("Save this to the recipe library?");
    await handler.handle({ updateId: 2, callbackQuery: { id: "cb", chatId, userId: "9", data: "ln" } });
    expect(api.sent.at(-1)?.text).toBe("Noodles — which day?");
  });

  it("cancels an open interview without writing a meal", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/add https://example.test/soup fri dinner"));
    await handler.handle(tap("x"));
    expect(planner.added).toEqual([]);
    expect(api.sent.at(-1)?.text).toBe("Not saved on a meal.");
  });

  it("sends /cook for one title hit", async () => {
    const { api, handler } = setup();
    await handler.handle(message("/cook tomato soup"));
    expect(api.sent.at(-1)?.text).toContain("Ingredients");
    expect(api.sent.at(-1)?.text).toContain("Taste.");
  });

  it("says a link stub has no method", async () => {
    const { api, handler } = setup({
      recipes: [recipe("link", "example.com", { ingredients: [], steps: [] })],
    });
    await handler.handle(message("/cook example.com"));
    expect(api.sent.at(-1)?.text).toContain("No ingredients or steps saved.");
  });

  it("says tomorrow has no recipe when only free-form is planned", async () => {
    const { api, handler } = setup();
    await handler.handle(message("/cook tomorrow"));
    expect(api.sent.at(-1)?.text).toBe("Tomorrow has no recipe to cook from.");
  });

  it("does not assign a deleted recipe from a stale tap", async () => {
    const { api, handler, planner } = setup();
    await handler.handle(message("/plan"));
    await handler.handle(tap("r:missing"));
    expect(planner.added).toEqual([]);
    expect(api.sent.at(-1)?.text).toContain("That recipe is gone.");
    expect(api.sent.at(-1)?.text).toContain("Not saved on a meal.");
  });
});
