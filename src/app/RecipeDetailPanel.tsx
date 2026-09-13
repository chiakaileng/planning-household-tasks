"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { deleteRecipe } from "@/app/deleteRecipe";
import { RecipeDraftCard } from "@/app/RecipeDraftCard";
import { readApiJson } from "@/app/readApiJson";
import { refreshRecipeFromSource } from "@/app/RecipeRefreshButton";
import type { RecipeDraft } from "@/domain/recipe/RecipeDraft";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";

export type RecipeDetailHandle = {
  save: () => Promise<boolean>;
};

export const RecipeDetailPanel = forwardRef<RecipeDetailHandle, {
  recipe: SavedRecipe;
  onSaved: (recipe: SavedRecipe) => void;
  onDeleted?: (id: string) => void;
  onClose?: () => void;
}>(function RecipeDetailPanel({ recipe, onSaved, onDeleted, onClose }, ref) {
  const [draft, setDraft] = useState<RecipeDraft>(toDraft(recipe));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(recipe));
  }, [recipe]);

  async function persist(): Promise<boolean> {
    if (!draft.title.trim()) {
      setMessage("Title is required.");
      return false;
    }
    const response = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draft }),
    });
    const result = await readApiJson<{ recipe?: SavedRecipe; error?: string }>(response);
    if (result.recipe) {
      setDraft(toDraft(result.recipe));
      onSaved(result.recipe);
      return true;
    }
    setMessage(result.error ?? "Could not save.");
    return false;
  }

  async function save(): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    const ok = await persist();
    if (ok) {
      onClose?.();
    }
    setBusy(false);
    return ok;
  }

  async function refresh() {
    setBusy(true);
    setMessage(null);
    if (draft.sourceUrl !== recipe.sourceUrl || draft.sourceText !== recipe.sourceText) {
      const saved = await persist();
      if (!saved) {
        setBusy(false);
        return;
      }
    }
    const result = await refreshRecipeFromSource(recipe.id);
    if (result.ok) {
      setDraft(toDraft(result.recipe));
      onSaved(result.recipe);
      setMessage("Refreshed from source.");
    } else {
      setMessage(result.error);
    }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`Delete “${recipe.title}” from the pool? Meals that used it keep the name.`)) {
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await deleteRecipe(recipe.id);
    if (result.ok) {
      onDeleted?.(recipe.id);
    } else {
      setMessage(result.error);
    }
    setBusy(false);
  }

  useImperativeHandle(ref, () => ({ save }), [draft, recipe.id]);

  return (
    <>
      <RecipeDraftCard
        draft={draft}
        busy={busy}
        heading="Recipe"
        saveLabel="Save changes"
        onChange={setDraft}
        onSave={() => void save()}
        onRefresh={() => void refresh()}
        onDelete={onDeleted ? () => void remove() : undefined}
      />
      {message ? (
        <p className={`status ${message === "Saved." || message === "Refreshed from source." ? "status-ok" : ""}`}>
          {message}
        </p>
      ) : null}
    </>
  );
});

function toDraft(recipe: SavedRecipe): RecipeDraft {
  return {
    title: recipe.title,
    servings: recipe.servings,
    calories: recipe.calories,
    protein: recipe.protein,
    fat: recipe.fat,
    carbohydrates: recipe.carbohydrates,
    fibre: recipe.fibre,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    sourceType: recipe.sourceType,
    sourceUrl: recipe.sourceUrl,
    sourceText: recipe.sourceText,
    notes: recipe.notes,
    tags: recipe.tags,
    emojis: recipe.emojis,
  };
}
