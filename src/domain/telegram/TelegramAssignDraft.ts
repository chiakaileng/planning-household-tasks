import type { PlannedSlot } from "@/domain/telegram/TelegramWhenParser";

export type AssignContent =
  | { kind: "recipe"; recipeId: string; title: string; sourceUrl: string | null }
  | { kind: "freeform"; text: string; title: string | null };

export type AssignAwaiting =
  | "url"
  | "freeform"
  | "title"
  | "library"
  | "put_on_meal"
  | "recipe"
  | "day"
  | "meal"
  | "eaters"
  | "cook";

export type TelegramAssignDraft = {
  userId: string;
  chatId: string;
  promptMessageId: number | null;
  awaiting: AssignAwaiting;
  content: AssignContent | null;
  slots: PlannedSlot[];
  pendingDay: string | null;
  weekShift: 0 | 1;
  eaterIds: string[];
  eatersDone: boolean;
  cookId: string | null;
  cookDone: boolean;
  search: string;
  page: number;
  pickerKind: "plan" | "cook" | "unplan";
  poolLine: string | null;
  libraryAsked: boolean;
};

export function emptyAssignDraft(userId: string, chatId: string): TelegramAssignDraft {
  return {
    userId,
    chatId,
    promptMessageId: null,
    awaiting: "recipe",
    content: null,
    slots: [],
    pendingDay: null,
    weekShift: 0,
    eaterIds: [],
    eatersDone: false,
    cookId: null,
    cookDone: false,
    search: "",
    page: 0,
    pickerKind: "plan",
    poolLine: null,
    libraryAsked: false,
  };
}

export function draftTitle(draft: TelegramAssignDraft): string {
  if (draft.content?.kind === "recipe") {
    return draft.content.title;
  }
  if (draft.content?.kind === "freeform") {
    return draft.content.title?.trim() || draft.content.text;
  }
  return "that dish";
}
