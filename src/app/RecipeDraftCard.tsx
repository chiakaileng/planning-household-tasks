"use client";

import { NotesTagsFields } from "@/app/NotesTagsFields";
import { RecipeEmojiFields } from "@/app/RecipeEmojiFields";
import type { Ingredient } from "@/domain/recipe/Ingredient";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import { sourceTypeFrom } from "@/domain/recipe/RecipeSource";

export function RecipeDraftCard({
  draft,
  busy,
  heading,
  saveLabel,
  duplicate,
  onChange,
  onSave,
  onRefresh,
  onDelete,
}: {
  draft: RecipeDraft;
  busy: boolean;
  heading: string;
  saveLabel: string;
  duplicate?: { existingId: string; existingTitle: string } | null;
  onChange: (draft: RecipeDraft) => void;
  onSave: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
}) {
  function updateIngredient(index: number, patch: Partial<Ingredient>) {
    const ingredients = draft.ingredients.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    onChange({ ...draft, ingredients });
  }

  return (
    <div className="review">
      <h2 className="section-title">{heading}</h2>
      <label>
        Title
        <input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
      </label>
      <label>
        Servings
        <input
          type="number"
          value={draft.servings ?? ""}
          onChange={(event) => onChange({ ...draft, servings: readNumber(event.target.value) })}
        />
      </label>
      <div className="nutrition-grid">
        <label>
          Calories (kcal)
          <input
            type="number"
            value={draft.calories ?? ""}
            onChange={(event) => onChange({ ...draft, calories: readNumber(event.target.value) })}
          />
        </label>
        <label>
          Protein (g)
          <input
            type="number"
            step="0.1"
            value={draft.protein ?? ""}
            onChange={(event) => onChange({ ...draft, protein: readNumber(event.target.value) })}
          />
        </label>
        <label>
          Fat (g)
          <input
            type="number"
            step="0.1"
            value={draft.fat ?? ""}
            onChange={(event) => onChange({ ...draft, fat: readNumber(event.target.value) })}
          />
        </label>
        <label>
          Carbs (g)
          <input
            type="number"
            step="0.1"
            value={draft.carbohydrates ?? ""}
            onChange={(event) => onChange({ ...draft, carbohydrates: readNumber(event.target.value) })}
          />
        </label>
        <label>
          Fibre (g)
          <input
            type="number"
            step="0.1"
            value={draft.fibre ?? ""}
            onChange={(event) => onChange({ ...draft, fibre: readNumber(event.target.value) })}
          />
        </label>
      </div>
      <div className="source-url-row">
        <label className="grow">
          Source URL
          <input
            value={draft.sourceUrl ?? ""}
            placeholder="https://"
            onChange={(event) => {
              const sourceUrl = event.target.value || null;
              onChange({ ...draft, sourceUrl, sourceType: sourceTypeFrom(sourceUrl, draft.sourceText, draft.sourceType) });
            }}
          />
        </label>
        {onRefresh ? (
          <button
            className="btn"
            type="button"
            onClick={onRefresh}
            disabled={busy || !draft.sourceUrl?.trim()}
          >
            Refresh
          </button>
        ) : null}
      </div>
      <label>
        Original paste
        <textarea
          value={draft.sourceText ?? ""}
          rows={3}
          placeholder="The text this recipe was extracted from, if there is no URL"
          onChange={(event) => {
            const sourceText = event.target.value || null;
            onChange({ ...draft, sourceText, sourceType: sourceTypeFrom(draft.sourceUrl, sourceText, draft.sourceType) });
          }}
        />
      </label>
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
      <RecipeEmojiFields emojis={draft.emojis} onChange={(emojis) => onChange({ ...draft, emojis })} />
      <NotesTagsFields
        notes={draft.notes}
        tagList={draft.tags}
        onNotesChange={(notes) => onChange({ ...draft, notes })}
        onTagsChange={(next) => onChange({ ...draft, tags: next })}
      />
      {duplicate ? (
        <p className="flag">
          Already in the pool:{" "}
          <a href={`/recipes/${duplicate.existingId}`}>{duplicate.existingTitle}</a>
        </p>
      ) : null}
      <div className="row">
        <button className="btn" type="button" onClick={onSave} disabled={busy || !draft.title.trim() || Boolean(duplicate)}>
          {saveLabel}
        </button>
        {onDelete ? (
          <button className="btn btn-quiet" type="button" onClick={onDelete} disabled={busy}>
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}

function readNumber(value: string): number | null {
  if (!value) {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}
