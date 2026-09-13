import { AppConfig } from "@/config/AppConfig";
import { GeminiLlmClient } from "@/ingestion/GeminiLlmClient";
import { HtmlTextExtractor } from "@/ingestion/HtmlTextExtractor";
import { IngredientLineParser } from "@/ingestion/IngredientLineParser";
import { JsonLdRecipeParser } from "@/ingestion/JsonLdRecipeParser";
import { LlmRecipeExtractor } from "@/ingestion/LlmRecipeExtractor";
import { PageFetcher } from "@/ingestion/PageFetcher";
import { RecipeExtractionPrompt } from "@/ingestion/RecipeExtractionPrompt";
import { RecipeImporter } from "@/ingestion/RecipeImporter";
import { RecipeSourceRefresher } from "@/ingestion/RecipeSourceRefresher";
import { LlmUsageRepository } from "@/persistence/LlmUsageRepository";
import { prisma } from "@/persistence/prisma";
import { MealPlanRepository } from "@/persistence/MealPlanRepository";
import { MemberRepository } from "@/persistence/MemberRepository";
import { WeekMealPlanner } from "@/planning/WeekMealPlanner";
import { RecipeRepository } from "@/persistence/RecipeRepository";
import { CalendarDate } from "@/domain/plan/CalendarDate";
import { WeekRange } from "@/domain/plan/WeekRange";

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

export function createRecipeSourceRefresher(): RecipeSourceRefresher {
  return new RecipeSourceRefresher(createImporter());
}

export function createRecipeRepository(): RecipeRepository {
  return new RecipeRepository(prisma);
}

export function createUsageRepository(): LlmUsageRepository {
  return new LlmUsageRepository(prisma);
}

export function createMemberRepository(): MemberRepository {
  return new MemberRepository(prisma);
}

export function createWeekMealPlanner(): WeekMealPlanner {
  const config = new AppConfig();
  const weeks = new WeekRange(new CalendarDate(config.weekTimeZone), config.weekStartsOn);
  return new WeekMealPlanner(config, new MealPlanRepository(prisma, weeks));
}
