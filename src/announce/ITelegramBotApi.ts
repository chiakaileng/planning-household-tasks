export type TelegramMessage = {
  messageId: number;
  chatId: string;
  userId: string;
  text: string;
  isBot: boolean;
  replyToMessageId: number | null;
};

export type TelegramCallbackQuery = {
  id: string;
  chatId: string;
  userId: string;
  data: string;
};

export type TelegramInlineQuery = {
  id: string;
  userId: string;
  query: string;
};

export type TelegramUpdate = {
  updateId: number;
  message?: TelegramMessage;
  callbackQuery?: TelegramCallbackQuery;
  inlineQuery?: TelegramInlineQuery;
};

export type TelegramInlineButton =
  | { text: string; data: string }
  | { text: string; switchInline: string };

export type TelegramSendRequest = {
  text: string;
  buttons?: TelegramInlineButton[][];
  forceReply?: boolean;
};

export type TelegramSendOutcome = { ok: true; messageId: number } | { ok: false; error: string };

export interface ITelegramBotApi {
  send(request: TelegramSendRequest): Promise<TelegramSendOutcome>;
  edit(messageId: number, request: TelegramSendRequest): Promise<TelegramSendOutcome>;
  answerCallback(callbackId: string): Promise<void>;
  answerInline(
    inlineQueryId: string,
    results: readonly { id: string; title: string; description?: string }[],
  ): Promise<void>;
  getUpdates(offset: number | undefined, timeoutSec: number): Promise<TelegramUpdate[] | null>;
  setMyCommands(): Promise<void>;
  deleteWebhook(): Promise<void>;
}
