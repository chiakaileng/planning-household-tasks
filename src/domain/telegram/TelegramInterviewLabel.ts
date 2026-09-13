import { draftTitle, type TelegramAssignDraft } from "@/domain/telegram/TelegramAssignDraft";

/**
 * Interview questions never quote a free-form paste. A named title (recipe or
 * the title they typed) may appear. The save line uses that title.
 */
export class TelegramInterviewLabel {
  constructor(private readonly maxChars: number) {}

  promptTitle(draft: TelegramAssignDraft): string {
    if (draft.content?.kind === "recipe") {
      return this.shorten(draft.content.title);
    }
    if (draft.content?.kind === "freeform" && draft.content.title) {
      return this.shorten(draft.content.title);
    }
    return "";
  }

  saveLabel(draft: TelegramAssignDraft): string {
    if (draft.content?.kind === "recipe") {
      return this.shorten(draft.content.title);
    }
    if (draft.content?.kind === "freeform" && draft.content.title) {
      return this.shorten(draft.content.title);
    }
    const raw = draftTitle(draft);
    if (raw.includes("\n") || raw.length > this.maxChars) {
      return "that dish";
    }
    return raw.trim() || "that dish";
  }

  shorten(value: string): string {
    const first = value.split(/\r?\n/, 1)[0]?.trim() || value.trim();
    if (first.length <= this.maxChars) {
      return first;
    }
    const keep = Math.max(1, this.maxChars - 1);
    return `${first.slice(0, keep).trimEnd()}…`;
  }
}
