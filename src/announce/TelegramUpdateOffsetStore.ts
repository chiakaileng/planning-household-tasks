export interface ITelegramUpdateOffsetStore {
  read(): Promise<number | null>;
  write(offset: number): Promise<void>;
}

/**
 * Process-local offset. A restart skips leftover Telegram backlog once, then
 * hears new commands. Kept off the filesystem so Next’s instrumentation bundle
 * does not try to load Node `fs` / `path`.
 */
export class TelegramMemoryOffsetStore implements ITelegramUpdateOffsetStore {
  private value: number | null = null;

  async read(): Promise<number | null> {
    return this.value;
  }

  async write(offset: number): Promise<void> {
    this.value = offset;
  }
}
