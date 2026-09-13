"use client";

import { useMemo, useState } from "react";
import { RecipeEmojiMark } from "@/app/RecipeEmojiFields";
import { RecipeDetailPanel } from "@/app/RecipeDetailPanel";
import { RecipeIngestPanel } from "@/app/RecipeIngestPanel";
import { TagFilterBar } from "@/app/TagFilterBar";
import { deleteRecipe } from "@/app/deleteRecipe";
import { RecipeEmojiAssigner } from "@/domain/recipe/RecipeEmojiAssigner";
import type { RecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import { RecipeNutritionSummary } from "@/domain/recipe/RecipeNutritionSummary";
import { RecipeTagFilter } from "@/domain/recipe/RecipeTagFilter";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";

type SavedSummary = RecipeNutrition & {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  sourceText: string | null;
  notes: string | null;
  tags: string[];
  emojis: string[];
};

const nutritionSummary = new RecipeNutritionSummary();

const recipeEmojis = new RecipeEmojiAssigner();
const tagFilterLogic = new RecipeTagFilter();

export function IngestForm({ initialRecipes }: { initialRecipes: SavedSummary[] }) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<SavedRecipe | null>(null);

  const tags = useMemo(() => {
    const names = new Set<string>();
    for (const recipe of recipes) {
      for (const tag of recipe.tags) {
        names.add(tag);
      }
    }
    return [...names].sort();
  }, [recipes]);

  const visibleRecipes = useMemo(() => {
    return recipes.filter((recipe) => tagFilterLogic.matches(recipe.tags, tagFilter));
  }, [recipes, tagFilter]);

  function onSaved(recipe: SavedRecipe) {
    setRecipes((current) => [toSummary(recipe), ...current.filter((item) => item.id !== recipe.id)]);
    setJustAdded(recipe);
  }

  async function onDelete(recipe: SavedSummary) {
    if (!window.confirm(`Delete “${recipe.title}” from the pool? Meals that used it keep the name.`)) {
      return;
    }
    const result = await deleteRecipe(recipe.id);
    if (result.ok) {
      setRefreshError(null);
      setRecipes((current) => current.filter((item) => item.id !== recipe.id));
      if (justAdded?.id === recipe.id) {
        setJustAdded(null);
      }
      return;
    }
    setRefreshError(result.error);
  }

  function onRefreshed(recipe: SavedRecipe) {
    setRefreshError(null);
    setRecipes((current) => current.map((item) => (item.id === recipe.id ? toSummary(recipe) : item)));
  }

  return (
    <>
    <div className="workbench">
      <section className="card">
        <h2 className="section-title">Add a recipe</h2>
        <RecipeIngestPanel onSaved={onSaved} />
      </section>

      <section className="card">
        <h2 className="section-title">The pool</h2>
        <div className="pool-header">
          <TagFilterBar
            tags={tags}
            selected={tagFilter}
            onToggle={(tag) => setTagFilter((current) => tagFilterLogic.toggle(current, tag))}
            onClear={() => setTagFilter([])}
          />
        </div>
        {refreshError ? <p className="status">{refreshError}</p> : null}
        {recipes.length === 0 ? <p className="empty">No data</p> : null}
        {recipes.length > 0 && visibleRecipes.length === 0 ? <p className="empty">No recipes match those tags.</p> : null}
        <ul className="recipe-list">
          {visibleRecipes.map((recipe) => (
            <li key={recipe.id} className="recipe-row">
              <div className="recipe-row-head">
                <a className="recipe-name" href={`/recipes/${recipe.id}`}>
                  <RecipeEmojiMark emojis={recipeEmojis.display(recipe.emojis, { ...recipe, ingredients: [] })} /> {recipe.title}
                </a>
                <button className="btn btn-quiet" type="button" onClick={() => void onDelete(recipe)}>
                  Delete
                </button>
              </div>
              <div className="recipe-meta">
                {[recipe.sourceType, nutritionSummary.format(recipe)].filter(Boolean).join(" · ")}
              </div>
              {recipe.tags.length > 0 ? (
                <div className="tag-row">
                  {recipe.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag${tagFilter.includes(tag) ? " is-selected" : ""}`}
                      onClick={() => setTagFilter((current) => tagFilterLogic.toggle(current, tag))}
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
    {justAdded ? (
      <div
        className="composer-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setJustAdded(null);
          }
        }}
      >
        <section className="card composer-card ingest-card">
          <div className="finder-head">
            <h2 className="section-title">Added to the pool</h2>
            <button className="btn btn-quiet" type="button" onClick={() => setJustAdded(null)}>
              Close
            </button>
          </div>
          <RecipeDetailPanel
            key={justAdded.id}
            recipe={justAdded}
            onSaved={(recipe) => {
              onRefreshed(recipe);
            }}
            onClose={() => setJustAdded(null)}
            onDeleted={(id) => {
              setRecipes((current) => current.filter((item) => item.id !== id));
              setJustAdded(null);
            }}
          />
        </section>
      </div>
    ) : null}
    </>
  );
}

function toSummary(recipe: SavedRecipe): SavedSummary {
  return {
    id: recipe.id,
    title: recipe.title,
    sourceType: recipe.sourceType,
    sourceUrl: recipe.sourceUrl,
    sourceText: recipe.sourceText,
    notes: recipe.notes,
    tags: recipe.tags,
    emojis: recipe.emojis,
    calories: recipe.calories,
    protein: recipe.protein,
    fat: recipe.fat,
    carbohydrates: recipe.carbohydrates,
    fibre: recipe.fibre,
  };
}
