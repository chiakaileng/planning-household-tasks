"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteRecipe } from "@/app/deleteRecipe";
import { readApiJson } from "@/app/readApiJson";
import { refreshRecipeFromSource } from "@/app/RecipeRefreshButton";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";
import { sourceTypeFrom } from "@/domain/recipe/RecipeSource";

export function RecipePageManage({ recipe }: { recipe: SavedRecipe }) {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState(recipe.sourceUrl ?? "");
  const [sourceText, setSourceText] = useState(recipe.sourceText ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const draft: SavedRecipe = {
    ...recipe,
    sourceUrl: sourceUrl.trim() || null,
    sourceText: sourceText.trim() || null,
    sourceType: sourceTypeFrom(sourceUrl, sourceText, recipe.sourceType),
  };

  async function persistSource(): Promise<boolean> {
    const response = await fetch(`/api/recipes/${recipe.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draft }),
    });
    const result = await readApiJson<{ recipe?: SavedRecipe; error?: string }>(response);
    if (result.recipe) {
      setSourceUrl(result.recipe.sourceUrl ?? "");
      setSourceText(result.recipe.sourceText ?? "");
      return true;
    }
    setMessage(result.error ?? "Could not save the source.");
    return false;
  }

  async function refresh() {
    setBusy(true);
    setMessage(null);
    const saved = await persistSource();
    if (!saved) {
      setBusy(false);
      return;
    }
    const result = await refreshRecipeFromSource(recipe.id);
    if (result.ok) {
      setSourceUrl(result.recipe.sourceUrl ?? "");
      setSourceText(result.recipe.sourceText ?? "");
      setMessage("Refreshed from source.");
      router.refresh();
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
    const result = await deleteRecipe(recipe.id);
    if (result.ok) {
      router.push("/recipes");
      router.refresh();
      return;
    }
    setMessage(result.error);
    setBusy(false);
  }

  return (
    <div>
      <div className="source-url-row">
        <label className="grow">
          Source URL
          <input value={sourceUrl} placeholder="https://" onChange={(event) => setSourceUrl(event.target.value)} />
        </label>
        <button className="btn" type="button" disabled={busy || !sourceUrl.trim()} onClick={() => void refresh()}>
          Refresh
        </button>
      </div>
      <label>
        Original paste
        <textarea
          value={sourceText}
          rows={3}
          placeholder="The text this recipe was extracted from, if there is no URL"
          onChange={(event) => setSourceText(event.target.value)}
        />
      </label>
      <div className="row">
        <button className="btn btn-quiet" type="button" disabled={busy} onClick={() => void remove()}>
          Delete
        </button>
      </div>
      {message ? <p className={`status ${message === "Refreshed from source." ? "status-ok" : ""}`}>{message}</p> : null}
    </div>
  );
}
