"use client";

import { useEffect, useMemo, useState } from "react";
import { NotesTagsFields } from "@/app/NotesTagsFields";
import type { Ingredient } from "@/domain/recipe/Ingredient";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { TagNormalizer } from "@/domain/recipe/TagNormalizer";
import type { ExtractFromPasteResult, ImportFromUrlResult, LlmCostSnapshot } from "@/ingestion/ImportResults";

type SavedSummary = { id: string; title: string; sourceType: string; notes: string | null; tags: string[] };

const tagNames = new TagNormalizer();

export function IngestForm({ initialRecipes }: { initialRecipes: SavedSummary[] }) {
  const [url, setUrl] = useState("");
  const [paste, setPaste] = useState("");
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cost, setCost] = useState<LlmCostSnapshot | null>(null);
  const [lifetimeUsd, setLifetimeUsd] = useState(0);
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [tagFilter, setTagFilter] = useState("");

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
    setDuplicateWarning(null);
    const response = await fetch("/api/recipes/import-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const result = (await response.json()) as ImportFromUrlResult;
    applyImport(result);
    setBusy(false);
  }

  async function extractPaste() {
    setBusy(true);
    setMessage(null);
    setDuplicateWarning(null);
    const response = await fetch("/api/recipes/extract-paste", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: paste }),
    });
    const result = (await response.json()) as ExtractFromPasteResult;
    if (result.kind === "ready") {
      setDraft(ensureHouseholdFields(result.recipe));
      applyCost(result.cost);
      setMessage("Check the draft below, then save. Extraction is not trusted until you confirm.");
    } else {
      setDraft(null);
      if (result.kind === "extraction_failed") {
        applyCost(result.cost);
      }
      setMessage(result.message);
    }
    setBusy(false);
  }

  function applyImport(result: ImportFromUrlResult) {
    if (result.kind === "ready") {
      setDraft(ensureHouseholdFields(result.recipe));
      applyCost(result.cost);
      setMessage(
        result.via === "jsonld"
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

  async function save(confirmDuplicate = false) {
    if (!draft) {
      return;
    }
    setBusy(true);
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draft, confirmDuplicate }),
    });
    const result = (await response.json()) as
      | { kind: "duplicate"; warning: string }
      | { kind: "saved"; recipe: SavedSummary }
      | { error: string };

    if ("kind" in result && result.kind === "duplicate") {
      setDuplicateWarning(result.warning);
      setBusy(false);
      return;
    }
    if ("kind" in result && result.kind === "saved") {
      setRecipes((current) => [result.recipe, ...current]);
      setDraft(null);
      setDuplicateWarning(null);
      setMessage(`Saved “${result.recipe.title}” with sourceType ${result.recipe.sourceType}.`);
      setBusy(false);
      return;
    }
    setMessage("error" in result ? result.error : "Could not save.");
    setBusy(false);
  }

  const visibleRecipes = useMemo(() => {
    const needle = tagNames.normalize(tagFilter);
    if (!needle) {
      return recipes;
    }
    return recipes.filter((recipe) => recipe.tags.includes(needle));
  }, [recipes, tagFilter]);

  const selectedTag = tagNames.normalize(tagFilter);

  return (
    <>
      <p className="caption" style={{ marginBottom: "1.15rem" }}>
        Gemini {model || "—"} · lifetime {formatUsd(lifetimeUsd)}
        {cost
          ? ` · last call ${formatUsd(cost.thisCallUsd)} (${cost.thisCallInputTokens} in / ${cost.thisCallOutputTokens} out)`
          : " · last call none (JSON-LD imports are free)"}
      </p>

      <div className="workbench">
        <section className="card">
          <h2 className="section-title">Add a recipe</h2>
          <p>Uses structured recipe data on the page when it exists. Otherwise Gemini reads the text.</p>
          <div className="row">
            <input
              className="grow"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
            />
            <button className="btn" type="button" onClick={() => void importUrl()} disabled={busy}>
              Import URL
            </button>
          </div>

          <h3 className="list-title">Or paste text</h3>
          <textarea
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            rows={8}
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
            <DraftEditor
              draft={draft}
              busy={busy}
              duplicateWarning={duplicateWarning}
              onChange={setDraft}
              onSave={() => void save(false)}
              onSaveAnyway={() => void save(true)}
            />
          ) : null}
        </section>

        <section className="card">
          <h2 className="section-title">The pool</h2>
          <div className="pool-header">
            <input
              className="grow"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              placeholder="Filter by tag"
            />
            <button className="btn btn-quiet" type="button" onClick={() => setTagFilter("")}>
              Clear filter
            </button>
          </div>
          {recipes.length === 0 ? <p className="empty">No data</p> : null}
          {recipes.length > 0 && visibleRecipes.length === 0 ? <p className="empty">No recipes match that tag.</p> : null}
          <ul className="recipe-list">
            {visibleRecipes.map((recipe) => (
              <li key={recipe.id} className="recipe-row">
                <a className="recipe-name" href={`/recipes/${recipe.id}`}>
                  {recipe.title}
                </a>
                <div className="recipe-meta">{recipe.sourceType}</div>
                {recipe.tags.length > 0 ? (
                  <div className="tag-row">
                    {recipe.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`tag${selectedTag === tag ? " is-selected" : ""}`}
                        onClick={() => setTagFilter(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : null}
                {recipe.notes ? <div className="notes-preview">{recipe.notes}</div> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function DraftEditor({
  draft,
  busy,
  duplicateWarning,
  onChange,
  onSave,
  onSaveAnyway,
}: {
  draft: RecipeDraft;
  busy: boolean;
  duplicateWarning: string | null;
  onChange: (draft: RecipeDraft) => void;
  onSave: () => void;
  onSaveAnyway: () => void;
}) {
  function updateIngredient(index: number, patch: Partial<Ingredient>) {
    const ingredients = draft.ingredients.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    onChange({ ...draft, ingredients });
  }

  return (
    <div className="review">
      <h2 className="section-title">Review before saving</h2>
      <label>
        Title
        <input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
      </label>
      <label>
        Servings
        <input
          type="number"
          value={draft.servings ?? ""}
          onChange={(event) => onChange({ ...draft, servings: event.target.value ? Number(event.target.value) : null })}
        />
      </label>
      <p className="caption">sourceType {draft.sourceType}</p>
      <h3 className="list-title">Ingredients</h3>
      <p className="caption">Quantity, unit, name (including “can be …” notes), optional extra note.</p>
      {draft.ingredients.map((ingredient, index) => (
        <div key={index} className="ingredient-grid">
          <input
            value={ingredient.quantity ?? ""}
            placeholder="qty"
            onChange={(event) => updateIngredient(index, { quantity: event.target.value || null })}
          />
          <input
            value={ingredient.unit ?? ""}
            placeholder="unit"
            onChange={(event) => updateIngredient(index, { unit: event.target.value || null })}
          />
          <input
            value={ingredient.name}
            placeholder="name and alternatives"
            onChange={(event) => updateIngredient(index, { name: event.target.value })}
          />
          <input
            value={ingredient.note ?? ""}
            placeholder="note"
            onChange={(event) => updateIngredient(index, { note: event.target.value || null })}
          />
          {ingredient.parseFlagged ? <span className="flag">Check this line — quantity or unit was unclear.</span> : null}
        </div>
      ))}
      <h3 className="list-title">Steps</h3>
      {draft.steps.map((step, index) => (
        <textarea
          key={index}
          value={step}
          onChange={(event) => {
            const steps = draft.steps.map((item, itemIndex) => (itemIndex === index ? event.target.value : item));
            onChange({ ...draft, steps });
          }}
          rows={2}
        />
      ))}
      <NotesTagsFields
        notes={draft.notes}
        tagList={draft.tags}
        onNotesChange={(notes) => onChange({ ...draft, notes })}
        onTagsChange={(next) => onChange({ ...draft, tags: next })}
      />
      {duplicateWarning ? <p>{duplicateWarning}</p> : null}
      <div className="row">
        <button className="btn" type="button" onClick={onSave} disabled={busy}>
          Save recipe
        </button>
        {duplicateWarning ? (
          <button className="btn btn-quiet" type="button" onClick={onSaveAnyway} disabled={busy}>
            Save a second copy
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function ensureHouseholdFields(draft: RecipeDraft): RecipeDraft {
  return {
    ...draft,
    notes: draft.notes ?? null,
    tags: draft.tags ?? [],
  };
}
