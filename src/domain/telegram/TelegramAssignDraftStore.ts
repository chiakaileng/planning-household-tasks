import type { TelegramAssignDraft } from "@/domain/telegram/TelegramAssignDraft";

/**
 * In-memory interview state. A process restart drops drafts on purpose so a
 * half meal is never written.
 */
export class TelegramAssignDraftStore {
  private readonly drafts = new Map<string, TelegramAssignDraft>();

  get(chatId: string, userId: string): TelegramAssignDraft | undefined {
    return this.drafts.get(key(chatId, userId));
  }

  set(draft: TelegramAssignDraft): void {
    this.drafts.set(key(draft.chatId, draft.userId), draft);
  }

  take(chatId: string, userId: string): TelegramAssignDraft | undefined {
    const draft = this.get(chatId, userId);
    this.clear(chatId, userId);
    return draft;
  }

  clear(chatId: string, userId: string): void {
    this.drafts.delete(key(chatId, userId));
  }
}

function key(chatId: string, userId: string): string {
  return `${chatId}:${userId}`;
}
