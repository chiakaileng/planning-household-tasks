import { AppConfig } from "@/config/AppConfig";
import { createTelegramInboundPoller } from "@/lib/createTelegramInbound";

const processCache = globalThis as unknown as { telegramInboundStarted?: boolean };

/** One poller for the Node process. Safe after a hot reload check. */
export function startTelegramInboundPoller(): void {
  if (processCache.telegramInboundStarted) {
    return;
  }
  processCache.telegramInboundStarted = true;
  try {
    const config = new AppConfig();
    if (!config.hasTelegramCredentials()) {
      console.warn("Telegram inbound: add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env.");
      return;
    }
    const { poller, api } = createTelegramInboundPoller();
    void api.deleteWebhook();
    void api.setMyCommands();
    console.info("Telegram inbound: listening for /add /plan /free /cook /unplan /help.");
    void loop(poller, config);
  } catch (error) {
    processCache.telegramInboundStarted = false;
    console.error("Telegram inbound failed to start.", error);
  }
}

async function loop(poller: { tick(): Promise<void> }, config: AppConfig): Promise<void> {
  for (;;) {
    const startedAt = Date.now();
    try {
      await poller.tick();
    } catch (error) {
      console.error("Telegram inbound poll failed; will retry.", error);
    }
    // Fast ticks (a handled message, or timeout-0) must not use the 30s announce interval.
    if (Date.now() - startedAt < 1000) {
      await new Promise((resolve) => setTimeout(resolve, config.telegramPollIdleMs));
    }
  }
}
