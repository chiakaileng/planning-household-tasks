import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";

export type LlmCostSnapshot = {
  thisCallUsd: number;
  thisCallInputTokens: number;
  thisCallOutputTokens: number;
  lifetimeUsd: number;
  model: string;
};

export type ImportFromUrlResult =
  | {
      kind: "ready";
      recipe: RecipeDraft;
      /** jsonld needed no LLM; llm_fallback used Phase 1b on page text. */
      via: "jsonld" | "llm_fallback";
      cost: LlmCostSnapshot | null;
    }
  | {
      kind: "fetch_failed";
      message: string;
      canPaste: true;
    }
  | {
      kind: "extraction_failed";
      message: string;
      cost: LlmCostSnapshot | null;
    }
  | {
      kind: "missing_llm_key";
      message: string;
    };

export type ExtractFromPasteResult =
  | {
      kind: "ready";
      recipe: RecipeDraft;
      cost: LlmCostSnapshot;
    }
  | {
      kind: "extraction_failed";
      message: string;
      cost: LlmCostSnapshot | null;
    }
  | {
      kind: "missing_llm_key";
      message: string;
    };
