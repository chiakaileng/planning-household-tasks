import type { TelegramHtmlText } from "@/domain/plan/TelegramHtmlText";

/**
 * Locked chat copy. Pages and the poller do not invent these sentences.
 */
export class TelegramInboundCopy {
  private readonly helpBlocks: readonly { heading: string; syntax: readonly string[] }[] = [
    {
      heading: "Add recipes to your recipe library",
      syntax: ["/add", "/add <recipe url>", "/add <recipe url> fri dinner"],
    },
    {
      heading: "Put a recipe from your library on a meal",
      syntax: ["/plan", "/plan tomato", "/plan tomato soup fri dinner"],
    },
    {
      heading: "Put food that is not a recipe on a meal",
      syntax: ["/free takeaway noodles", "/free takeaway noodles fri dinner"],
    },
    {
      heading: "Show ingredients and steps",
      syntax: ["/cook", "/cook tomato soup", "/cook tomorrow"],
    },
    {
      heading: "Take a dish off a meal",
      syntax: ["/unplan", "/unplan fri dinner"],
    },
  ];

  private readonly helpNotes = [
    "Days: mon–sun, today, tomorrow, next fri",
    "Meals: breakfast, lunch, dinner (or b, l, d)",
    "The bot asks what to call it, whether to save it in the library, who eats, and who cooks. Cancel if you stop.",
  ];

  /** Headings as normal text; command lines as Telegram <code> (grey syntax). */
  helpHtml(html: TelegramHtmlText): string {
    const blocks = this.helpBlocks.map((block) =>
      [html.escape(block.heading), ...block.syntax.map((line) => html.code(line))].join("\n"),
    );
    return [...blocks, this.helpNotes.map((line) => html.escape(line)).join("\n")].join("\n\n");
  }

  readonly notSavedOnMeal = "Not saved on a meal.";
  readonly notSaved = "Not saved.";
  readonly sendUrl = "Send the recipe URL. Reply to this message.";
  readonly whatIsIt = "What is it? Reply to this message.";
  readonly whatToCallIt = "What should we call it? Reply to this message.";
  readonly saveToLibrary = "Save this to the recipe library?";
  readonly notAddedToLibrary = "Not added to the recipe library.";
  readonly nothingToRemove = "Nothing on that meal to remove.";
  readonly alreadyOff = "That dish is already off the meal.";
  readonly whichToRemove = "Which dish to remove?";

  removed(title: string, whenLabel: string): string {
    return `Removed · ${title} · ${whenLabel}`;
  }

  readonly nothingInPool = "Nothing in the pool yet. /add a URL, or something else.";
  readonly recipeGone = "That recipe is gone.";
  readonly noMembers = "No household members yet.";

  pickRecipe(hasPool: boolean): string {
    return hasPool ? "Pick a recipe, or something else" : this.nothingInPool;
  }

  matches(query: string): string {
    return `Matches for “${query}”`;
  }

  nothingMatches(query: string): string {
    return `Nothing in the pool matches “${query}”.`;
  }

  whichDay(title: string): string {
    return this.withLead(title, "Which day?");
  }

  whichMeal(title: string, dayLabel: string): string {
    return this.withLead([title, dayLabel].filter(Boolean).join(" · "), "Which meal?");
  }

  whoEats(title: string, whenLabel: string): string {
    return this.withLead([title, whenLabel].filter(Boolean).join(" · "), "Who eats?");
  }

  whoCooks(title: string, whenLabel: string): string {
    return this.withLead([title, whenLabel].filter(Boolean).join(" · "), "Who cooks?");
  }

  private withLead(lead: string, question: string): string {
    return lead ? `${lead} — ${question.charAt(0).toLowerCase()}${question.slice(1)}` : question;
  }

  putOnMeal(title: string): string {
    return `Put ${title} on a meal?`;
  }

  addedToPool(title: string): string {
    return `Added to the pool · ${title}`;
  }

  alreadyInPool(title: string): string {
    return `Already in the pool · ${title}`;
  }

  addedToLibrary(title: string): string {
    return `Saved to the recipe library · ${title}`;
  }

  alreadyInLibrary(title: string): string {
    return `Already in the recipe library · ${title}`;
  }

  savedAsLink(title: string): string {
    return `Saved as a link · ${title}\nCould not read a recipe from that page.`;
  }

  notPutOnMeal(titleHtml: string): string {
    return `${titleHtml}\nNot put on a meal.`;
  }

  whenNotUnderstood(): string {
    return "That day or meal was not understood.";
  }

  noRecipeToCook(whenLabel: string): string {
    const label = whenLabel.trim() || "That meal";
    return `${label} has no recipe to cook from.`;
  }

  whichRecipe(): string {
    return "Which recipe?";
  }

  assigned(input: {
    whenLabel: string;
    titleHtml: string;
    eaterNames: readonly string[];
    cookName: string | null;
    noMembers: boolean;
  }): string {
    const people = this.peopleLine(input.eaterNames, input.cookName, input.noMembers);
    return `On ${input.whenLabel} · ${input.titleHtml} · ${people}`;
  }

  peopleLine(eaterNames: readonly string[], cookName: string | null, noMembers: boolean): string {
    if (noMembers) {
      return "no members yet";
    }
    const eaters = eaterNames.filter((name) => name.trim().length > 0);
    const cook = cookName?.trim() || "";
    if (eaters.length === 0 && !cook) {
      return "no eaters or cook yet";
    }
    const eat = eaters.length === 0 ? "no eaters yet" : `${eaters.join(", ")} ${eaters.length === 1 ? "eats" : "eat"}`;
    const cooks = cook ? `${cook} cooks` : "no cook yet";
    return `${eat} · ${cooks}`;
  }

  slotList(labels: readonly string[]): string {
    return labels.join(", ");
  }
}
