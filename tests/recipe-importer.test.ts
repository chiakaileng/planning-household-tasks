import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AppConfig } from "@/config/AppConfig";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { HtmlTextExtractor } from "@/ingestion/HtmlTextExtractor";
import { IngredientLineParser } from "@/ingestion/IngredientLineParser";
import type { IJsonLdRecipeParser } from "@/ingestion/IJsonLdRecipeParser";
import type { IPageFetcher } from "@/ingestion/IPageFetcher";
import type { ExtractedRecipePayload, IRecipeExtractor } from "@/ingestion/IRecipeExtractor";
import { JsonLdRecipeParser } from "@/ingestion/JsonLdRecipeParser";
import { PageFetchError } from "@/ingestion/PageFetcher";
import { RecipeImporter } from "@/ingestion/RecipeImporter";
import type { ILlmUsageRepository } from "@/persistence/ILlmUsageRepository";

const jsonLdHtml = readFileSync(path.join(__dirname, "fixtures/recipe-with-jsonld.html"), "utf8");
const fallbackHtml = readFileSync(path.join(__dirname, "fixtures/page-without-jsonld.html"), "utf8");

function testConfig(overrides: Record<string, string> = {}) {
  return new AppConfig({
    GEMINI_API_KEY: "test-key",
    LLM_BASE_URL: "https://example.test/v1beta",
    LLM_MODEL: "test-model",
    LLM_INPUT_PRICE_PER_MILLION_USD: "0.30",
    LLM_OUTPUT_PRICE_PER_MILLION_USD: "2.50",
    PAGE_FETCH_TIMEOUT_MS: "1000",
    PAGE_FETCH_USER_AGENT: "test-agent",
    DATABASE_URL: "file:./dev.db",
    ...overrides,
  });
}

class MemoryUsage implements ILlmUsageRepository {
  total = 0;
  async record(event: { estimatedUsd: number }): Promise<void> {
    this.total += event.estimatedUsd;
  }
  async totalEstimatedUsd(): Promise<number> {
    return this.total;
  }
}

class FixedFetcher implements IPageFetcher {
  constructor(private readonly html: string) {}
  async fetchHtml(): Promise<string> {
    return this.html;
  }
}

class FailingFetcher implements IPageFetcher {
  async fetchHtml(): Promise<string> {
    throw new PageFetchError("That URL is unreachable. Paste the recipe text instead.");
  }
}

class FakeExtractor implements IRecipeExtractor {
  constructor(private readonly payload: ExtractedRecipePayload | null) {}
  async extract(): Promise<ExtractedRecipePayload | null> {
    return this.payload;
  }
}

function importer(options: {
  fetcher: IPageFetcher;
  extractor?: IRecipeExtractor;
  parser?: IJsonLdRecipeParser;
  config?: AppConfig;
}) {
  const fallbackDraft: RecipeDraft = {
    title: "Simple rice",
    servings: 2,
    ingredients: [{ name: "rice", quantity: "1", unit: "cup", note: null, parseFlagged: false }],
    steps: ["Simmer covered."],
    sourceType: "pasted",
    sourceUrl: "https://example.test/notes",
    sourceText: "rice",
    notes: null,
    tags: [],
  };

  return new RecipeImporter(
    options.config ?? testConfig(),
    options.fetcher,
    options.parser ?? new JsonLdRecipeParser(new IngredientLineParser()),
    new HtmlTextExtractor(),
    options.extractor ??
      new FakeExtractor({
        draft: fallbackDraft,
        inputTokens: 1000,
        outputTokens: 200,
      }),
    new MemoryUsage(),
  );
}

describe("RecipeImporter.importFromUrl", () => {
  it("returns a complete Recipe from JSON-LD with no LLM call", async () => {
    const result = await importer({ fetcher: new FixedFetcher(jsonLdHtml) }).importFromUrl("https://example.test/pasta");
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.via).toBe("jsonld");
    expect(result.recipe.sourceType).toBe("url");
    expect(result.recipe.title).toBe("Weeknight Tomato Pasta");
    expect(result.recipe.notes).toBeNull();
    expect(result.recipe.tags).toEqual([]);
    expect(result.cost).toBeNull();
  });

  it("falls back to treating page text as pasted content when JSON-LD is missing", async () => {
    const result = await importer({ fetcher: new FixedFetcher(fallbackHtml) }).importFromUrl("https://example.test/notes");
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.via).toBe("llm_fallback");
    expect(result.recipe.sourceType).toBe("pasted");
    expect(result.recipe.sourceUrl).toBe("https://example.test/notes");
    expect(result.cost?.thisCallInputTokens).toBe(1000);
  });

  it("does not save when the URL is unreachable", async () => {
    const result = await importer({ fetcher: new FailingFetcher() }).importFromUrl("https://example.test/down");
    expect(result.kind).toBe("fetch_failed");
    if (result.kind === "fetch_failed") {
      expect(result.canPaste).toBe(true);
    }
  });
});

describe("RecipeImporter.extractFromPastedText", () => {
  it("returns an editable draft and does not persist", async () => {
    const draft: RecipeDraft = {
      title: "Simple rice",
      servings: 2,
      ingredients: [{ name: "rice", quantity: "1", unit: "cup", note: null, parseFlagged: false }],
      steps: ["Simmer."],
      sourceType: "pasted",
      sourceUrl: null,
      sourceText: "rice",
      notes: null,
      tags: [],
    };
    const result = await importer({
      fetcher: new FixedFetcher(""),
      extractor: new FakeExtractor({ draft, inputTokens: 50, outputTokens: 20 }),
    }).extractFromPastedText("1 cup rice\n2 cups water");

    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.recipe.sourceType).toBe("pasted");
      expect(result.recipe.title).toBe("Simple rice");
      expect(result.recipe.notes).toBeNull();
      expect(result.recipe.tags).toEqual([]);
    }
  });

  it("fails closed on text that is not a recipe", async () => {
    const result = await importer({
      fetcher: new FixedFetcher(""),
      extractor: new FakeExtractor(null),
    }).extractFromPastedText("50% off bananas this week only");
    expect(result.kind).toBe("extraction_failed");
  });
});
