import type { AppConfig } from "@/config/AppConfig";
import type { ITelegramBotApi } from "@/announce/ITelegramBotApi";
import type { TelegramInboundHandler } from "@/announce/TelegramInboundHandler";
import type { ITelegramUpdateOffsetStore } from "@/announce/TelegramUpdateOffsetStore";

/**
 * Long-poll getUpdates. First successful fetch with no stored offset skips
 * backlog so old group commands do not replay.
 */
export class TelegramInboundPoller {
  private memoryOffset: number | null = null;
  private skippedBacklog = false;

  constructor(
    private readonly config: AppConfig,
    private readonly api: ITelegramBotApi,
    private readonly handler: TelegramInboundHandler,
    private readonly offset: ITelegramUpdateOffsetStore,
  ) {}

  async tick(): Promise<void> {
    if (!this.config.hasTelegramCredentials()) {
      return;
    }
    const stored = this.memoryOffset ?? (await this.offset.read());
    const first = stored === null && !this.skippedBacklog;
    const updates = await this.api.getUpdates(first ? undefined : stored ?? undefined, first ? 0 : this.config.telegramPollTimeoutSec);
    if (updates === null) {
      console.warn("Telegram inbound: getUpdates returned nothing (network or webhook?).");
      return;
    }
    if (updates.length > 0) {
      console.info(`Telegram inbound: ${updates.length} update(s), first=${first}.`);
    }
    if (first) {
      await this.skipBacklog(updates);
      this.skippedBacklog = true;
      return;
    }
    for (const update of updates) {
      await this.handler.handle(update);
      await this.remember(update.updateId + 1);
    }
  }

  private async skipBacklog(firstBatch: Awaited<ReturnType<ITelegramBotApi["getUpdates"]>>): Promise<void> {
    let lastId = firstBatch && firstBatch.length > 0 ? firstBatch[firstBatch.length - 1]!.updateId : 0;
    let batch = firstBatch ?? [];
    while (batch.length > 0) {
      const next = await this.api.getUpdates(lastId + 1, 0);
      if (next === null || next.length === 0) {
        break;
      }
      lastId = next[next.length - 1]!.updateId;
      batch = next;
    }
    await this.remember(lastId + 1);
  }

  private async remember(offset: number): Promise<void> {
    this.memoryOffset = offset;
    try {
      await this.offset.write(offset);
    } catch (error) {
      console.error("Telegram inbound: could not save update offset.", error);
    }
  }
}
