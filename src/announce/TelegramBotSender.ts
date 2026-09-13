import type { AppConfig } from "@/config/AppConfig";
import type { ITelegramSender, TelegramSendResult } from "@/announce/ITelegramSender";

/**
 * HTTP sendMessage. Host, token, chat, and timeout come from config — never from the page.
 */
export class TelegramBotSender implements ITelegramSender {
  constructor(private readonly config: AppConfig) {}

  async send(text: string): Promise<TelegramSendResult> {
    if (!this.config.hasTelegramCredentials()) {
      return { ok: false, error: "Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env." };
    }
    const url = `${this.config.telegramApiBaseUrl.replace(/\/$/, "")}/bot${this.config.telegramBotToken}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: this.config.telegramChatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          link_preview_options: { is_disabled: true },
        }),
        signal: AbortSignal.timeout(this.config.telegramSendTimeoutMs),
      });
      const body = (await response.json()) as { ok?: boolean; description?: string };
      if (body.ok) {
        return { ok: true };
      }
      return { ok: false, error: body.description ?? "Telegram rejected the message." };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not reach Telegram." };
    }
  }
}
