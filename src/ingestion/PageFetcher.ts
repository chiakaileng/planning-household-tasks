import type { AppConfig } from "@/config/AppConfig";
import type { IPageFetcher } from "@/ingestion/IPageFetcher";

export class PageFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageFetchError";
  }
}

export class PageFetcher implements IPageFetcher {
  constructor(private readonly config: AppConfig) {}

  async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.pageFetchTimeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "user-agent": this.config.pageFetchUserAgent,
          accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        throw new PageFetchError(`Could not fetch that URL (HTTP ${response.status}).`);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof PageFetchError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new PageFetchError("The page timed out. Paste the recipe text instead.");
      }
      throw new PageFetchError("That URL is unreachable. Paste the recipe text instead.");
    } finally {
      clearTimeout(timer);
    }
  }
}
