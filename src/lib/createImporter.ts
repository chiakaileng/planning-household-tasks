import { AppConfig } from "@/config/AppConfig";
import { GeminiLlmClient } from "@/ingestion/GeminiLlmClient";
import { HtmlTextExtractor } from "@/ingestion/HtmlTextExtractor";
import { IngredientLineParser } from "@/ingestion/IngredientLineParser";
import { JsonLdRecipeParser } from "@/ingestion/JsonLdRecipeParser";
import { LlmRecipeExtractor } from "@/ingestion/LlmRecipeExtractor";
import { PageFetcher } from "@/ingestion/PageFetcher";
import { RecipeExtractionPrompt } from "@/ingestion/RecipeExtractionPrompt";
import { RecipeImporter } from "@/ingestion/RecipeImporter";
import { LlmUsageRepository } from "@/persistence/LlmUsageRepository";
import { prisma } from "@/persistence/prisma";
import { RecipeRepository } from "@/persistence/RecipeRepository";

/** Wires production implementations. Tests construct RecipeImporter with fakes instead. */
export function createImporter(): RecipeImporter {
  const config = new AppConfig();
  const ingredientParser = new IngredientLineParser();
  return new RecipeImporter(
    config,
    new PageFetcher(config),
    new JsonLdRecipeParser(ingredientParser),
    new HtmlTextExtractor(),
    new LlmRecipeExtractor(new GeminiLlmClient(config), new RecipeExtractionPrompt(), ingredientParser),
    new LlmUsageRepository(prisma),
  );
}

export function createRecipeRepository(): RecipeRepository {
  return new RecipeRepository(prisma);
}

export function createUsageRepository(): LlmUsageRepository {
  return new LlmUsageRepository(prisma);
}
