/**
 * Telegram HTML parse_mode. Titles become <a href> when there is an http(s) URL.
 * The sender turns off link previews so Telegram does not show a thumbnail.
 */
export class TelegramHtmlText {
  escape(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /** Monospace on a muted background — Telegram has no grey text color. */
  code(value: string): string {
    return `<code>${this.escape(value)}</code>`;
  }

  recipeTitle(title: string, sourceUrl: string | null): string {
    const label = this.escape(title);
    const href = httpHref(sourceUrl);
    return href ? `<a href="${this.escape(href)}">${label}</a>` : label;
  }
}

function httpHref(raw: string | null): string | null {
  const value = raw?.trim() ?? "";
  if (!value) {
    return null;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}
