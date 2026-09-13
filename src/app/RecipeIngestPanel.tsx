"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { DismissibleRecipeCard } from "@/app/DismissibleRecipeCard";
import { RecipeDraftCard } from "@/app/RecipeDraftCard";
import { readApiJson } from "@/app/readApiJson";
import { RecipeEmojiAssigner } from "@/domain/recipe/RecipeEmojiAssigner";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";
import { RecipeRefreshMerger } from "@/domain/recipe/RecipeRefreshMerger";
import type { ExtractFromPasteResult, ImportFromUrlResult, LlmCostSnapshot } from "@/ingestion/ImportResults";

export type RecipeIngestHandle = {
  saveIfReady: () => Promise<boolean>;
};

export const RecipeIngestPanel = forwardRef<
  RecipeIngestHandle,
  { onSaved?: (recipe: SavedRecipe) => void; frameDraft?: boolean }
>(function RecipeIngestPanel({ onSaved, frameDraft = true }, ref) {
  const [url, setUrl] = useState("");
  const [paste, setPaste] = useState("");
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cost, setCost] = useState<LlmCostSnapshot | null>(null);
  const [lifetimeUsd, setLifetimeUsd] = useState(0);
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [duplicate, setDuplicate] = useState<{ existingId: string; existingTitle: string } | null>(null);

  useEffect(() => {
    void fetch("/api/llm-usage")
      .then((response) => response.json())
      .then((data: { lifetimeUsd: number; model: string }) => {
        setLifetimeUsd(data.lifetimeUsd);
        setModel(data.model);
      });
  }, []);

  async function importUrl() {
    setBusy(true);
    setMessage(null);
    setDuplicate(null);
    const response = await fetch("/api/recipes/import-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    await applyImport((await response.json()) as ImportFromUrlResult);
    setBusy(false);
  }

  async function extractPaste() {
    setBusy(true);
    setMessage(null);
    setDuplicate(null);
    const response = await fetch("/api/recipes/extract-paste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: paste }),
    });
    const result = (await response.json()) as ExtractFromPasteResult;
    if (result.kind === "ready") {
      const next = ensureHouseholdFields(result.recipe);
      setDraft(next);
      applyCost(result.cost);
      const alreadyThere = await flagIfDuplicate(next);
      setMessage(
        alreadyThere
          ? `Already in the pool (“${alreadyThere.existingTitle}”).`
          : "Check the draft below, then save. Extraction is not trusted until you confirm.",
      );
    } else {
      setDraft(null);
      if (result.kind === "extraction_failed") {
        applyCost(result.cost);
      }
      setMessage(result.message);
    }
    setBusy(false);
  }

  async function applyImport(result: ImportFromUrlResult) {
    if (result.kind === "ready") {
      const next = ensureHouseholdFields(result.recipe);
      setDraft(next);
      applyCost(result.cost);
      const alreadyThere = await flagIfDuplicate(next);
      setMessage(
        alreadyThere
          ? `Already in the pool (“${alreadyThere.existingTitle}”).`
          : result.via === "jsonld"
            ? "Imported from the page’s structured recipe data. Review and save — no typing needed."
            : "No structured data on that page, so this was extracted from the text. Review carefully before saving.",
      );
      return;
    }
    setDraft(null);
    if (result.kind === "extraction_failed") {
      applyCost(result.cost);
    }
    setMessage(result.message);
  }

  function applyCost(next: LlmCostSnapshot | null) {
    if (!next) {
      return;
    }
    setCost(next);
    setLifetimeUsd(next.lifetimeUsd);
    setModel(next.model);
  }

  async function save(): Promise<boolean> {
    if (!draft) {
      return true;
    }
    if (duplicate) {
      setMessage(`Already in the pool (“${duplicate.existingTitle}”).`);
      return false;
    }
    setBusy(true);
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draft }),
    });
    const result = await readApiJson<
      | { kind: "duplicate"; warning: string; existingId: string; existingTitle: string }
      | { kind: "saved"; recipe: SavedRecipe }
      | { error: string }
    >(response);

    if ("kind" in result && result.kind === "duplicate") {
      setDuplicate({ existingId: result.existingId, existingTitle: result.existingTitle });
      setMessage(result.warning);
      setBusy(false);
      return false;
    }
    if ("kind" in result && result.kind === "saved") {
      setDraft(null);
      setDuplicate(null);
      setUrl("");
      setPaste("");
      setMessage(`Saved “${result.recipe.title}” with sourceType ${result.recipe.sourceType}.`);
      onSaved?.(result.recipe);
      setBusy(false);
      return true;
    }
    setMessage("error" in result ? result.error : "Could not save.");
    setBusy(false);
    return false;
  }

  async function refreshDraft() {
    if (!draft) {
      return;
    }
    setBusy(true);
    setMessage(null);
    if (draft.sourceUrl?.trim() || url.trim()) {
      const response = await fetch("/api/recipes/import-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: draft.sourceUrl?.trim() || url.trim() }),
      });
      const result = (await response.json()) as ImportFromUrlResult;
      if (result.kind === "ready") {
        setDraft(refreshMerger.apply(draft, result.recipe));
        applyCost(result.cost);
        setMessage("Refreshed from source. Review and save.");
      } else {
        if (result.kind === "extraction_failed") {
          applyCost(result.cost);
        }
        setMessage(result.message);
      }
      setBusy(false);
      return;
    }

    const text = draft.sourceText?.trim() || paste.trim();
    const response = await fetch("/api/recipes/extract-paste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const result = (await response.json()) as ExtractFromPasteResult;
    if (result.kind === "ready") {
      setDraft(refreshMerger.apply(draft, result.recipe));
      applyCost(result.cost);
      setMessage("Refreshed from source. Review and save.");
    } else {
      if (result.kind === "extraction_failed") {
        applyCost(result.cost);
      }
      setMessage(result.message);
    }
    setBusy(false);
  }

  async function flagIfDuplicate(next: RecipeDraft) {
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draft: next, checkOnly: true }),
    });
    const result = await readApiJson<
      { kind: "duplicate"; existingId: string; existingTitle: string } | { kind: "ok" } | { error: string }
    >(response);
    if ("kind" in result && result.kind === "duplicate") {
      setDuplicate({ existingId: result.existingId, existingTitle: result.existingTitle });
      return result;
    }
    setDuplicate(null);
    return null;
  }

  useImperativeHandle(ref, () => ({ saveIfReady: () => save() }), [draft, duplicate]);

  const reviewCard = draft ? (
    <RecipeDraftCard
      draft={draft}
      busy={busy}
      heading="Review before saving"
      saveLabel="Save recipe"
      duplicate={duplicate}
      onChange={setDraft}
      onSave={() => void save()}
      onRefresh={() => void refreshDraft()}
    />
  ) : null;

  return (
    <>
      <p className="caption" style={{ marginBottom: "1.15rem" }}>
        Gemini {model || "—"} · lifetime {formatUsd(lifetimeUsd)}
        {cost
          ? ` · last call ${formatUsd(cost.thisCallUsd)} (${cost.thisCallInputTokens} in / ${cost.thisCallOutputTokens} out)`
          : " · last call none (JSON-LD imports are free)"}
      </p>
      <p>Uses structured recipe data on the page when it exists. Otherwise Gemini reads the text.</p>
      <div className="row">
        <input className="grow" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" />
        <button className="btn" type="button" onClick={() => void importUrl()} disabled={busy}>
          Import URL
        </button>
      </div>
      <h3 className="list-title">Or paste text</h3>
      <textarea
        value={paste}
        onChange={(event) => setPaste(event.target.value)}
        rows={6}
        placeholder="Ingredients and steps, in any format"
      />
      <div className="row">
        <button className="btn" type="button" onClick={() => void extractPaste()} disabled={busy}>
          Extract from paste
        </button>
      </div>
      {message ? (
        <p className={`status ${message.startsWith("Saved") ? "status-ok" : ""}`} role="status">
          {message}
        </p>
      ) : null}
      {draft ? (
        frameDraft ? (
          <DismissibleRecipeCard title="New recipe" onClose={() => setDraft(null)}>
            {reviewCard}
          </DismissibleRecipeCard>
        ) : (
          reviewCard
        )
      ) : null}
    </>
  );
});

const refreshMerger = new RecipeRefreshMerger();

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function ensureHouseholdFields(draft: RecipeDraft): RecipeDraft {
  const assigner = new RecipeEmojiAssigner();
  const existing = assigner.clamp(draft.emojis ?? []);
  return {
    ...draft,
    notes: draft.notes ?? null,
    tags: draft.tags ?? [],
    calories: draft.calories ?? null,
    protein: draft.protein ?? null,
    fat: draft.fat ?? null,
    carbohydrates: draft.carbohydrates ?? null,
    fibre: draft.fibre ?? null,
    emojis: existing.length > 0 ? existing : assigner.suggest(draft),
  };
}
