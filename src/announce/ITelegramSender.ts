export type TelegramSendResult = { ok: true } | { ok: false; error: string };

export interface ITelegramSender {
  send(text: string): Promise<TelegramSendResult>;
}
