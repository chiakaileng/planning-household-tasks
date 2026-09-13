"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LlmCostSnapshot } from "@/ingestion/ImportResults";
import { readApiJson } from "@/app/readApiJson";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";

export async function refreshRecipeFromSource(id: string): Promise<
  { ok: true; recipe: SavedRecipe; cost: LlmCostSnapshot | null } | { ok: false; error: string }
> {
  const response = await fetch(`/api/recipes/${id}/refresh`, { method: "POST" });
  const result = await readApiJson<{ recipe?: SavedRecipe; cost?: LlmCostSnapshot | null; error?: string }>(response);
  if ("recipe" in result && result.recipe) {
    return { ok: true, recipe: result.recipe, cost: result.cost ?? null };
  }
  return { ok: false, error: result.error ?? "Could not refresh this recipe." };
}

export function RecipeRefreshButton({
  recipeId,
  busy: busyFromParent,
  compact,
  className,
  onRefreshed,
  onError,
}: {
  recipeId: string;
  busy?: boolean;
  compact?: boolean;
  className?: string;
  onRefreshed: (recipe: SavedRecipe) => void;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    const result = await refreshRecipeFromSource(recipeId);
    if (result.ok) {
      onRefreshed(result.recipe);
    } else {
      onError?.(result.error);
    }
    setBusy(false);
  }

  return (
    <button
      className={className ?? "btn btn-quiet"}
      type="button"
      onClick={() => void refresh()}
      disabled={busy || busyFromParent}
    >
      {busy ? "Refreshing…" : compact ? "Refresh" : "Refresh from source"}
    </button>
  );
}

export function RecipePageRefresh({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <div className="row">
      <RecipeRefreshButton
        recipeId={recipeId}
        onRefreshed={() => {
          setError(null);
          setDone(true);
          router.refresh();
        }}
        onError={(message) => {
          setDone(false);
          setError(message);
        }}
      />
      {done ? <p className="status status-ok">Refreshed from source.</p> : null}
      {error ? <p className="status">{error}</p> : null}
    </div>
  );
}
