import type { AppConfig } from "@/config/AppConfig";
import type {
  ITelegramBotApi,
  TelegramSendOutcome,
  TelegramSendRequest,
  TelegramUpdate,
} from "@/announce/ITelegramBotApi";

const COMMANDS = [
  { command: "add", description: "Add a recipe URL, optionally put it on meals" },
  { command: "plan", description: "Put a pool recipe or free-form on a meal" },
  { command: "free", description: "Put free-form food on a meal" },
  { command: "cook", description: "Ingredients and steps for a recipe" },
  { command: "unplan", description: "Remove a dish from a meal" },
  { command: "help", description: "How to add and assign" },
] as const;

/**
 * Telegram Bot HTTP API. Host, token, chat, and timeouts come from config.
 */
export class TelegramBotApi implements ITelegramBotApi {
  constructor(private readonly config: AppConfig) {}

  async send(request: TelegramSendRequest): Promise<TelegramSendOutcome> {
    return this.postMessage("sendMessage", this.messageBody(request));
  }

  async edit(messageId: number, request: TelegramSendRequest): Promise<TelegramSendOutcome> {
    return this.postMessage("editMessageText", { ...this.messageBody(request), message_id: messageId });
  }

  async answerCallback(callbackId: string): Promise<void> {
    await this.call("answerCallbackQuery", { callback_query_id: callbackId }, this.config.telegramSendTimeoutMs);
  }

  async answerInline(
    inlineQueryId: string,
    results: readonly { id: string; title: string; description?: string }[],
  ): Promise<void> {
    await this.call(
      "answerInlineQuery",
      {
        inline_query_id: inlineQueryId,
        cache_time: 0,
        results: results.slice(0, 20).map((result) => ({
          type: "article",
          id: result.id,
          title: result.title,
          description: result.description ?? "",
          input_message_content: {
            message_text: `/plan ${result.title}`,
          },
        })),
      },
      this.config.telegramSendTimeoutMs,
    );
  }

  async deleteWebhook(): Promise<void> {
    await this.call("deleteWebhook", { drop_pending_updates: false }, this.config.telegramSendTimeoutMs);
  }

  async getUpdates(offset: number | undefined, timeoutSec: number): Promise<TelegramUpdate[] | null> {
    if (!this.config.hasTelegramCredentials()) {
      return [];
    }
    const result = await this.call<{
      ok?: boolean;
      description?: string;
      result?: RawUpdate[];
    }>(
      "getUpdates",
      {
        offset,
        timeout: timeoutSec,
        allowed_updates: ["message", "callback_query", "inline_query"],
      },
      (timeoutSec + 5) * 1000,
    );
    if (!result?.ok || !Array.isArray(result.result)) {
      if (result?.description) {
        console.error("Telegram getUpdates failed:", result.description);
      }
      return null;
    }
    return result.result.map(toUpdate);
  }

  async setMyCommands(): Promise<void> {
    await this.call("setMyCommands", { commands: COMMANDS }, this.config.telegramSendTimeoutMs);
  }

  private messageBody(request: TelegramSendRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      chat_id: this.config.telegramChatId,
      text: request.text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      link_preview_options: { is_disabled: true },
    };
    if (request.forceReply) {
      // selective:true with no @mention leaves nobody targeted — the 1:1 reply box never appears.
      body.reply_markup = { force_reply: true, selective: false };
    } else if (request.buttons && request.buttons.length > 0) {
      body.reply_markup = {
        inline_keyboard: request.buttons.map((row) =>
          row.map((button) =>
            "switchInline" in button
              ? { text: button.text, switch_inline_query_current_chat: button.switchInline }
              : { text: button.text, callback_data: button.data },
          ),
        ),
      };
    }
    return body;
  }

  private async postMessage(method: string, body: Record<string, unknown>): Promise<TelegramSendOutcome> {
    if (!this.config.hasTelegramCredentials()) {
      return { ok: false, error: "Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env." };
    }
    const result = await this.call<{ ok?: boolean; description?: string; result?: { message_id?: number } }>(
      method,
      body,
      this.config.telegramSendTimeoutMs,
    );
    if (!result || !result.ok) {
      const error = result?.description ?? "Telegram rejected the message.";
      console.error(`Telegram ${method} failed:`, error);
      return { ok: false, error };
    }
    return { ok: true, messageId: result.result?.message_id ?? 0 };
  }

  private async call<T>(method: string, body: Record<string, unknown>, timeoutMs: number): Promise<T | null> {
    if (!this.config.hasTelegramCredentials()) {
      return null;
    }
    const url = `${this.config.telegramApiBaseUrl.replace(/\/$/, "")}/bot${this.config.telegramBotToken}/${method}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      return (await response.json()) as T;
    } catch (error) {
      console.error(`Telegram ${method} failed.`, error);
      return null;
    }
  }
}

type RawUpdate = {
  update_id: number;
  message?: RawMessage;
  callback_query?: {
    id: string;
    from?: { id?: number };
    message?: { chat?: { id?: number } };
    data?: string;
  };
  inline_query?: { id: string; from?: { id?: number }; query?: string };
};

type RawMessage = {
  message_id: number;
  text?: string;
  chat?: { id?: number };
  from?: { id?: number; is_bot?: boolean };
  reply_to_message?: { message_id?: number };
};

function toUpdate(raw: RawUpdate): TelegramUpdate {
  const message = raw.message
    ? {
        messageId: raw.message.message_id,
        chatId: String(raw.message.chat?.id ?? ""),
        userId: String(raw.message.from?.id ?? ""),
        text: raw.message.text ?? "",
        isBot: Boolean(raw.message.from?.is_bot),
        replyToMessageId: raw.message.reply_to_message?.message_id ?? null,
      }
    : undefined;
  const callbackQuery = raw.callback_query
    ? {
        id: raw.callback_query.id,
        chatId: String(raw.callback_query.message?.chat?.id ?? ""),
        userId: String(raw.callback_query.from?.id ?? ""),
        data: raw.callback_query.data ?? "",
      }
    : undefined;
  const inlineQuery = raw.inline_query
    ? {
        id: raw.inline_query.id,
        userId: String(raw.inline_query.from?.id ?? ""),
        query: raw.inline_query.query ?? "",
      }
    : undefined;
  return { updateId: raw.update_id, message, callbackQuery, inlineQuery };
}
