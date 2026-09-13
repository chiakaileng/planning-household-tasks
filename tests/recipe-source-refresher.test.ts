import { describe, expect, it } from "vitest";
import { AppConfig } from "@/config/AppConfig";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { emptyRecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import { HtmlTextExtractor } from "@/ingestion/HtmlTextExtractor";
import { IngredientLineParser } from "@/ingestion/IngredientLineParser";
import type { IPageFetcher } from "@/ingestion/IPageFetcher";
import type { ExtractedRecipePayload, IRecipeExtractor } from "@/ingestion/IRecipeExtractor";
import { JsonLdRecipeParser } from "@/ingestion/JsonLdRecipeParser";
import { PageFetchError } from "@/ingestion/PageFetcher";
import { RecipeImporter } from "@/ingestion/RecipeImporter";
import { RecipeSourceRefresher } from "@/ingestion/RecipeSourceRefresher";
import type { ILlmUsageRepository } from "@/persistence/ILlmUsageRepository";
import { readFileSync } from "node:fs";
import path from "node:path";

const jsonLdHtml = readFileSync(path.join(__dirname, "fixtures/recipe-with-jsonld.html"), "utf8");

function testConfig() {
  return new AppConfig({
    GEMINI_API_KEY: "test-key",
    LLM_BASE_URL: "https://example.test/v1beta",
    LLM_MODEL: "test-model",
    LLM_INPUT_PRICE_PER_MILLION_USD: "0.30",
    LLM_OUTPUT_PRICE_PER_MILLION_USD: "2.50",
    PAGE_FETCH_TIMEOUT_MS: "1000",
    PAGE_FETCH_USER_AGENT: "test-agent",
    DATABASE_URL: "file:./dev.db",
    WEEK_TIMEZONE: "Asia/Singapore",
    WEEK_STARTS_ON: "1",
    LEFTOVER_LOOKBACK_DAYS: "7",
  });
}

class MemoryUsage implements ILlmUsageRepository {
  async record(): Promise<void> {}
  async totalEstimatedUsd(): Promise<number> {
    return 0;
  }
}

function draft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    title: "Old pasta",
    servings: 2,
    ingredients: [{ name: "pasta", quantity: "1", unit: "box", note: null, parseFlagged: false }],
    steps: ["Cook."],
    sourceType: "url",
    sourceUrl: "https://example.test/pasta",
    sourceText: null,
    notes: "keep me",
    tags: ["family"],
    emojis: [],
    ...emptyRecipeNutrition(),
    ...overrides,
  };
}

function refresher(fetcher: IPageFetcher, extractor: IRecipeExtractor = { extract: async () => null }) {
  const importer = new RecipeImporter(
    testConfig(),
    fetcher,
    new JsonLdRecipeParser(new IngredientLineParser()),
    new HtmlTextExtractor(),
    extractor,
    new MemoryUsage(),
  );
  return new RecipeSourceRefresher(importer);
}

describe("RecipeSourceRefresher", () => {
  it("re-pulls a URL and fills nutrition, keeping notes and tags", async () => {
    const result = await refresher({ fetchHtml: async () => jsonLdHtml }).refresh(draft());
    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") {
      return;
    }
    expect(result.recipe.title).toBe("Old pasta");
    expect(result.recipe.notes).toBe("keep me");
    expect(result.recipe.tags).toEqual(["family"]);
    expect(result.recipe.calories).toBe(420);
    expect(result.recipe.protein).toBe(18);
  });

  it("re-extracts stored paste when there is no URL", async () => {
    const extracted: ExtractedRecipePayload = {
      draft: draft({
        sourceUrl: null,
        sourceText: "rice",
        calories: 250,
        protein: 6,
        notes: null,
        tags: [],
      }),
      inputTokens: 10,
      outputTokens: 5,
    };
    const result = await refresher(
      { fetchHtml: async () => "" },
      { extract: async () => extracted },
    ).refresh(draft({ sourceUrl: null, sourceText: "1 cup rice" }));
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.recipe.calories).toBe(250);
      expect(result.recipe.notes).toBe("keep me");
    }
  });

  it("fails closed when the URL cannot be fetched", async () => {
    const result = await refresher({
      fetchHtml: async () => {
        throw new PageFetchError("That URL is unreachable. Paste the recipe text instead.");
      },
    }).refresh(draft());
    expect(result.kind).toBe("failed");
  });

  it("is unavailable when the recipe has no source to pull", async () => {
    const result = await refresher({ fetchHtml: async () => jsonLdHtml }).refresh(
      draft({ sourceUrl: null, sourceText: null }),
    );
    expect(result.kind).toBe("unavailable");
  });
});
