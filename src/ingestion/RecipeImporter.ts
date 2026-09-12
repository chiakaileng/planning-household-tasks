import type { AppConfig } from "@/config/AppConfig";
import type { IHtmlTextExtractor } from "@/ingestion/IHtmlTextExtractor";
import type { IJsonLdRecipeParser } from "@/ingestion/IJsonLdRecipeParser";
import type { IPageFetcher } from "@/ingestion/IPageFetcher";
import type { IRecipeExtractor } from "@/ingestion/IRecipeExtractor";
import type { ExtractFromPasteResult, ImportFromUrlResult, LlmCostSnapshot } from "@/ingestion/ImportResults";
import { PageFetchError } from "@/ingestion/PageFetcher";
import type { ILlmUsageRepository } from "@/persistence/ILlmUsageRepository";

/**
 * Orchestrates Phase 1 (JSON-LD) then Phase 1b (LLM). Does not save.
 */
export class RecipeImporter {
  constructor(
    private readonly config: AppConfig,
    private readonly pageFetcher: IPageFetcher,
    private readonly jsonLdParser: IJsonLdRecipeParser,
    private readonly htmlText: IHtmlTextExtractor,
    private readonly llmExtractor: IRecipeExtractor,
    private readonly usage: ILlmUsageRepository,
  ) {}

  async importFromUrl(url: string): Promise<ImportFromUrlResult> {
    const trimmed = url.trim();
    if (!isHttpUrl(trimmed)) {
      return {
        kind: "fetch_failed",
        message: "Please paste a full http(s) URL.",
        canPaste: true,
      };
    }

    let html: string;
    try {
      html = await this.pageFetcher.fetchHtml(trimmed);
    } catch (error) {
      const message = error instanceof PageFetchError ? error.message : "That URL is unreachable. Paste the recipe text instead.";
      return { kind: "fetch_failed", message, canPaste: true };
    }

    const fromJsonLd = this.jsonLdParser.parse(html, trimmed);
    if (fromJsonLd) {
      return { kind: "ready", recipe: fromJsonLd, via: "jsonld", cost: null };
    }

    // Phase 1 failed → treat page text as pasted content (Phase 1b).
    if (!this.config.hasGeminiKey()) {
      return {
        kind: "missing_llm_key",
        message: "No structured recipe on that page, and GEMINI_API_KEY is not set for the paste fallback.",
      };
    }

    const pageText = this.htmlText.toPlainText(html);
    const extracted = await this.llmExtractor.extract(pageText, {
      sourceType: "pasted",
      sourceUrl: trimmed,
    });

    const cost = extracted
      ? await this.recordCost(extracted.inputTokens, extracted.outputTokens, "url_fallback")
      : await this.snapshot();

    if (!extracted) {
      return {
        kind: "extraction_failed",
        message: "Could not find a recipe on that page. Paste the ingredient list and steps instead.",
        cost,
      };
    }

    return { kind: "ready", recipe: extracted.draft, via: "llm_fallback", cost };
  }

  async extractFromPastedText(text: string): Promise<ExtractFromPasteResult> {
    const trimmed = text.trim();
    if (!trimmed) {
      return { kind: "extraction_failed", message: "Paste some recipe text first.", cost: null };
    }

    if (!this.config.hasGeminiKey()) {
      return {
        kind: "missing_llm_key",
        message: "GEMINI_API_KEY is missing, so paste extraction cannot run.",
      };
    }

    const extracted = await this.llmExtractor.extract(trimmed, {
      sourceType: "pasted",
      sourceUrl: null,
    });

    if (!extracted) {
      return {
        kind: "extraction_failed",
        message: "That text does not look like a recipe. Nothing was saved.",
        cost: await this.snapshot(),
      };
    }

    const cost = await this.recordCost(extracted.inputTokens, extracted.outputTokens, "paste");
    return { kind: "ready", recipe: extracted.draft, cost };
  }

  private async recordCost(inputTokens: number, outputTokens: number, purpose: string): Promise<LlmCostSnapshot> {
    const thisCallUsd = this.config.estimateUsd(inputTokens, outputTokens);
    await this.usage.record({
      model: this.config.llmModel,
      purpose,
      inputTokens,
      outputTokens,
      estimatedUsd: thisCallUsd,
    });
    const lifetimeUsd = await this.usage.totalEstimatedUsd();
    return {
      thisCallUsd,
      thisCallInputTokens: inputTokens,
      thisCallOutputTokens: outputTokens,
      lifetimeUsd,
      model: this.config.llmModel,
    };
  }

  private async snapshot(): Promise<LlmCostSnapshot | null> {
    const lifetimeUsd = await this.usage.totalEstimatedUsd();
    return {
      thisCallUsd: 0,
      thisCallInputTokens: 0,
      thisCallOutputTokens: 0,
      lifetimeUsd,
      model: this.config.llmModel,
    };
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
