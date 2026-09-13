"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { MealPeopleFields } from "@/app/MealPeopleFields";
import { readApiJson } from "@/app/readApiJson";
import { RecipeDetailPanel, type RecipeDetailHandle } from "@/app/RecipeDetailPanel";
import { RecipeEmojiMark } from "@/app/RecipeEmojiFields";
import { RecipeIngestPanel, type RecipeIngestHandle } from "@/app/RecipeIngestPanel";
import { TagFilterBar } from "@/app/TagFilterBar";
import { WeekRecap } from "@/app/WeekRecap";
import { recapWatchListKey } from "@/config/recapWatchList";
import { RecipeEmojiAssigner } from "@/domain/recipe/RecipeEmojiAssigner";
import type { SavedMember } from "@/domain/member/SavedMember";
import type { DishContentType } from "@/domain/plan/DishContentType";
import { DishPeopleCaption } from "@/domain/plan/DishPeopleCaption";
import type { LeftoverSourceMeal, PlannedDish, PlannedMeal } from "@/domain/plan/PlannedMeal";
import type { RecapLens } from "@/domain/plan/RecapRoleFilter";
import { RecapWatchList } from "@/domain/plan/RecapWatchList";
import { RecapWatchListStorage } from "@/domain/plan/RecapWatchListStorage";
import { RecipeNutritionSummary } from "@/domain/recipe/RecipeNutritionSummary";
import { RecipeTagFilter } from "@/domain/recipe/RecipeTagFilter";
import type { SavedRecipe } from "@/domain/recipe/SavedRecipe";

type DefaultSlot = { key: string; name: string; sortOrder: number };

type Composer = {
  mealId: string;
  contentType: DishContentType;
  recipeId: string | null;
  recipeTitle: string;
  sourceMealId: string | null;
  leftoverText: string;
  freeformText: string;
  eaterIds: string[];
  cookId: string;
  editingDishId: string | null;
};

const RECIPE_DRAG = "application/x-household-recipe";
const recipeEmojis = new RecipeEmojiAssigner();
const nutritionSummary = new RecipeNutritionSummary();
const tagFilterLogic = new RecipeTagFilter();
const dishPeople = new DishPeopleCaption();
const recapWatch = new RecapWatchList();
const recapStorage = typeof window === "undefined" ? null : new RecapWatchListStorage(window.localStorage, recapWatchListKey);

export function WeekBoard({
  initialWeekStart,
  initialDays,
  initialToday,
  initialMeals,
  initialMembers,
  initialRecipes,
  initialLeftovers,
  defaultSlots,
}: {
  initialWeekStart: string;
  initialDays: string[];
  initialToday: string;
  initialMeals: PlannedMeal[];
  initialMembers: SavedMember[];
  initialRecipes: SavedRecipe[];
  initialLeftovers: LeftoverSourceMeal[];
  defaultSlots: readonly DefaultSlot[];
}) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [days, setDays] = useState(initialDays);
  const [meals, setMeals] = useState(initialMeals);
  const [leftovers, setLeftovers] = useState(initialLeftovers);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [composer, setComposer] = useState<Composer | null>(null);
  const [extraName, setExtraName] = useState("");
  const [extraAfter, setExtraAfter] = useState(defaultSlots[0]?.key ?? "breakfast");
  const [extraRecurs, setExtraRecurs] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dropMealId, setDropMealId] = useState<string | null>(null);
  const [draggingRecipe, setDraggingRecipe] = useState<{ id: string; title: string } | null>(null);
  const [addingRecipe, setAddingRecipe] = useState(false);
  const [viewingRecipe, setViewingRecipe] = useState<SavedRecipe | null>(null);
  const [didDragRecipe, setDidDragRecipe] = useState(false);
  const [watchIds, setWatchIds] = useState<string[]>([]);
  const [recapRoles, setRecapRoles] = useState<RecapLens[]>([]);
  const [announceNote, setAnnounceNote] = useState<{ text: string; ok: boolean } | null>(null);
  const recipeDetail = useRef<RecipeDetailHandle>(null);
  const recipeIngest = useRef<RecipeIngestHandle>(null);

  const memberIds = useMemo(() => initialMembers.map((member) => member.id), [initialMembers]);

  useEffect(() => {
    if (!recapStorage) {
      return;
    }
    const prefs = recapStorage.read();
    setWatchIds(recapWatch.keepExisting(prefs.memberIds, memberIds));
    setRecapRoles(prefs.roles);
  }, [memberIds]);

  function persistGlance(nextIds: string[], nextRoles: RecapLens[]) {
    const memberIdsKept = recapWatch.keepExisting(nextIds, memberIds);
    setWatchIds(memberIdsKept);
    setRecapRoles(nextRoles);
    recapStorage?.write({ memberIds: memberIdsKept, roles: nextRoles });
  }

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

  async function searchPool(nextQuery = query) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }
    const response = await fetch(`/api/recipes?${params.toString()}`);
    const data = (await response.json()) as { recipes: SavedRecipe[] };
    setRecipes(data.recipes);
  }

  async function loadWeek(start: string) {
    const response = await fetch(`/api/week?start=${start}`);
    const data = (await response.json()) as { weekStart: string; days: string[]; meals: PlannedMeal[] };
    setWeekStart(data.weekStart);
    setDays(data.days);
    setMeals(data.meals);
    const leftoverResponse = await fetch("/api/week/leftovers");
    const leftoverData = (await leftoverResponse.json()) as { sources: LeftoverSourceMeal[] };
    setLeftovers(leftoverData.sources);
  }

  function openComposer(mealId: string, partial: Partial<Composer> = {}) {
    setComposer({
      mealId,
      contentType: "freeform",
      recipeId: null,
      recipeTitle: "",
      sourceMealId: leftovers[0]?.id ?? null,
      leftoverText: "",
      freeformText: "",
      eaterIds: [],
      cookId: "",
      editingDishId: null,
      ...partial,
    });
    setMessage(null);
  }

  function editDish(meal: PlannedMeal, dish: PlannedDish) {
    openComposer(meal.id, {
      contentType: (dish.contentType as DishContentType) || "freeform",
      recipeId: dish.recipeId,
      recipeTitle: dish.title,
      sourceMealId: dish.sourceMealId,
      leftoverText: dish.leftoverText ?? "",
      freeformText: dish.freeformText ?? "",
      eaterIds: dish.eaters.map((eater) => eater.memberId).filter((id): id is string => Boolean(id)),
      cookId: dish.cookMemberId ?? "",
      editingDishId: dish.id,
    });
  }

  async function saveDish() {
    if (!composer) {
      return;
    }
    setBusy(true);
    setMessage(null);
    const draft = {
      contentType: composer.contentType,
      recipeId: composer.recipeId,
      sourceMealId: composer.sourceMealId,
      leftoverText: composer.leftoverText,
      freeformText: composer.freeformText,
      cookMemberId: composer.cookId,
      eaterMemberIds: composer.eaterIds,
    };
    const response = await fetch(
      composer.editingDishId ? `/api/dishes/${composer.editingDishId}` : "/api/week/dishes",
      {
        method: composer.editingDishId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mealId: composer.mealId, draft }),
      },
    );
    const result = (await response.json()) as { kind?: string; error?: string };
    if (result.kind === "saved") {
      await loadWeek(weekStart);
      setComposer(null);
      setMessage("Saved on that meal.");
    } else {
      setMessage(result.error ?? "Could not save that dish.");
    }
    setBusy(false);
  }

  async function removeDish(dish: PlannedDish) {
    if (!window.confirm(`Remove “${dish.title}” from this meal?`)) {
      return;
    }
    setBusy(true);
    await fetch(`/api/dishes/${dish.id}`, { method: "DELETE" });
    await loadWeek(weekStart);
    setBusy(false);
  }

  async function addExtra() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/week/extras", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: extraName,
        insertAfterSlotKey: extraAfter,
        weekStart,
        recurs: extraRecurs,
      }),
    });
    const result = (await response.json()) as { kind?: string; error?: string; meals?: PlannedMeal[] };
    if (result.kind === "saved" && result.meals) {
      setMeals(result.meals);
      setExtraName("");
      setMessage(extraRecurs ? "Extra meal added and will recur on later weeks." : "Extra meal added for this week.");
    } else {
      setMessage(result.error ?? "Could not add that meal.");
    }
    setBusy(false);
  }

  function placeRecipeOnMeal(mealId: string, recipe: { id: string; title: string }) {
    setDraggingRecipe(null);
    openComposer(mealId, {
      contentType: "recipe",
      recipeId: recipe.id,
      recipeTitle: recipe.title,
    });
  }

  function assignRecipe(recipe: SavedRecipe) {
    const fallback = meals.find((meal) => meal.date === initialToday) ?? meals[0];
    if (!fallback) {
      setMessage("Open a week before assigning a recipe.");
      return;
    }
    openComposer(fallback.id, {
      contentType: "recipe",
      recipeId: recipe.id,
      recipeTitle: recipe.title,
    });
  }

  function onRecipeDragStart(event: DragEvent, recipe: SavedRecipe) {
    const payload = { id: recipe.id, title: recipe.title };
    setDidDragRecipe(true);
    setDraggingRecipe(payload);
    event.dataTransfer.setData(RECIPE_DRAG, JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", recipe.title);
    event.dataTransfer.effectAllowed = "copy";
  }

  function onMealDragOver(event: DragEvent, mealId: string) {
    if (draggingRecipe || [...event.dataTransfer.types].includes(RECIPE_DRAG)) {
      event.preventDefault();
      setDropMealId(mealId);
    }
  }

  function onMealDrop(event: DragEvent, mealId: string) {
    event.preventDefault();
    setDropMealId(null);
    const raw = event.dataTransfer.getData(RECIPE_DRAG);
    const recipe = raw ? (JSON.parse(raw) as { id: string; title: string }) : draggingRecipe;
    if (!recipe) {
      return;
    }
    placeRecipeOnMeal(mealId, recipe);
  }


  const slotRows = useMemo(() => {
    const firstDay = days[0];
    return meals
      .filter((meal) => meal.date === firstDay)
      .map((meal) => ({ key: meal.slotKey, name: meal.name }));
  }, [days, meals]);

  function mealAt(date: string, slotKey: string): PlannedMeal | undefined {
    return meals.find((meal) => meal.date === date && meal.slotKey === slotKey);
  }

  const calendarColumns = calendarGridStyle(days.length);

  async function pushTelegram(kind: "weekly" | "tomorrow") {
    setBusy(true);
    setAnnounceNote(null);
    const response = await fetch("/api/telegram/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, weekStart: kind === "weekly" ? weekStart : undefined }),
    });
    const result = await readApiJson<{ kind?: string; error?: string }>(response);
    setAnnounceNote(
      result.kind === "sent"
        ? { text: kind === "weekly" ? "Sent this week to Telegram." : "Sent tomorrow to Telegram.", ok: true }
        : { text: result.error ?? "Could not send to Telegram.", ok: false },
    );
    setBusy(false);
  }

  async function openRecipeToCook(recipeId: string) {
    const existing = recipes.find((recipe) => recipe.id === recipeId);
    if (existing) {
      setViewingRecipe(existing);
      return;
    }
    const response = await fetch(`/api/recipes/${recipeId}`);
    const result = await readApiJson<{ recipe?: SavedRecipe }>(response);
    const recipe = result.recipe;
    if (recipe) {
      setRecipes((current) => [recipe, ...current.filter((item) => item.id !== recipe.id)]);
      setViewingRecipe(recipe);
    }
  }

  return (
    <div className="week-layout">
      {message ? <p className="status status-ok">{message}</p> : null}

      <section className={`card calendar-card${draggingRecipe ? " is-awaiting-drop" : ""}`}>
        {draggingRecipe ? (
          <p className="drop-banner">Drop “{draggingRecipe.title}” on a meal</p>
        ) : null}
        <div className="calendar-toolbar">
          <button type="button" className="btn btn-quiet" onClick={() => void loadWeek(shiftWeek(weekStart, -7))}>
            Previous
          </button>
          <div className="calendar-heading">
            <h2 className="section-title">{weekHeading(days[0] ?? weekStart)}</h2>
            {days.includes(initialToday) ? <p className="caption">This week</p> : null}
          </div>
          <button type="button" className="btn btn-quiet" onClick={() => void loadWeek(shiftWeek(weekStart, 7))}>
            Next
          </button>
        </div>
        <div className="row calendar-announce">
          <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void pushTelegram("weekly")}>
            Push weekly
          </button>
          <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void pushTelegram("tomorrow")}>
            Push tomorrow
          </button>
          {announceNote ? (
            <p className={`status ${announceNote.ok ? "status-ok" : ""}`}>{announceNote.text}</p>
          ) : null}
        </div>

        <div className="calendar-scroll">
          <div
            className="calendar-grid"
            style={calendarColumns}
          >
            <div className="calendar-corner" />
            {days.map((day, index) => (
              <div
                key={day}
                className={`calendar-dayhead${day === initialToday ? " is-today" : ""}${index === days.length - 1 ? " is-sunday" : ""}`}
              >
                <span className="calendar-weekday">{weekdayLabel(day)}</span>
                <span className="calendar-date">{dateLabel(day)}</span>
              </div>
            ))}
            {slotRows.flatMap((slot) => [
              <div key={`${slot.key}-label`} className="calendar-slotlabel">
                {slot.name}
              </div>,
              ...days.map((day, index) => {
                const meal = mealAt(day, slot.key);
                const sundayClass = index === days.length - 1 ? " is-sunday" : "";
                if (!meal) {
                  return <div key={`${day}-${slot.key}`} className={`calendar-cell${sundayClass}`} />;
                }
                return (
                  <div
                    key={meal.id}
                    className={`calendar-cell${dropMealId === meal.id ? " is-drop" : ""}${day === initialToday ? " is-today" : ""}${sundayClass}${draggingRecipe ? " is-receiving" : ""}`}
                    onDragOver={(event) => onMealDragOver(event, meal.id)}
                    onDragLeave={() => setDropMealId((current) => (current === meal.id ? null : current))}
                    onDrop={(event) => onMealDrop(event, meal.id)}
                  >
                    {meal.dishes.map((dish) => (
                      <button
                        key={dish.id}
                        type="button"
                        className="dish-pill"
                        title={`${contentLabel(dish)}${dish.recipeMissing ? " · pool recipe gone" : ""} · ${dishPeople.format(dish)}`}
                        onClick={() => editDish(meal, dish)}
                      >
                        <span className="dish-pill-title">{dish.title}</span>
                        <span className="dish-pill-meta">{dishPeople.format(dish)}</span>
                      </button>
                    ))}
                    {draggingRecipe ? (
                      <span className="drop-hint">Drop here</span>
                    ) : (
                      <button type="button" className="cell-add" onClick={() => openComposer(meal.id)}>
                        Add
                      </button>
                    )}
                  </div>
                );
              }),
            ])}
          </div>

          <WeekRecap
            days={days}
            today={initialToday}
            meals={meals}
            members={initialMembers}
            watchIds={watchIds}
            roles={recapRoles}
            onWatchIds={(ids) => persistGlance(ids, recapRoles)}
            onRoles={(nextRoles) => persistGlance(watchIds, nextRoles)}
            onOpenRecipe={(recipeId) => void openRecipeToCook(recipeId)}
            weekdayLabel={weekdayLabel}
            dateLabel={dateLabel}
            gridStyle={calendarColumns}
          />
        </div>

        <div className="calendar-extra">
          <p className="caption">Add a meal between the usual ones. Recur copies the slot, not the dishes.</p>
          <div className="extra-row">
            <input
              className="field extra-name"
              value={extraName}
              onChange={(event) => setExtraName(event.target.value)}
              placeholder="Snack"
              aria-label="Extra meal name"
            />
            <select
              className="field extra-after"
              value={extraAfter}
              onChange={(event) => setExtraAfter(event.target.value)}
              aria-label="Insert extra meal after"
            >
              {slotRows.map((slot) => (
                <option key={slot.key} value={slot.key}>
                  After {slot.name}
                </option>
              ))}
            </select>
            <label className="choice extra-recur">
              <input type="checkbox" checked={extraRecurs} onChange={(event) => setExtraRecurs(event.target.checked)} />
              Recur
            </label>
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void addExtra()}>
              Add meal row
            </button>
          </div>
        </div>
      </section>

      <aside className="card week-finder">
        <div className="finder-head">
          <div>
            <h2 className="section-title">Recipes</h2>
            <p className="caption">Add one, then drag it onto a meal or click Assign.</p>
          </div>
          <div className="row finder-search">
            <input
              className="field grow"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void searchPool();
                }
              }}
              placeholder="Search name…"
            />
            <button type="button" className="btn" onClick={() => void searchPool()}>
              Search
            </button>
          </div>
        </div>
        <TagFilterBar
          tags={tags}
          selected={tagFilter}
          onToggle={(tag) => setTagFilter((current) => tagFilterLogic.toggle(current, tag))}
          onClear={() => setTagFilter([])}
        />
        {visibleRecipes.length === 0 ? <p className="finder-empty">No matching recipes</p> : null}
        <ul className="finder-grid">
            <li className="finder-item finder-add-item">
              <button type="button" className="finder-add" onClick={() => setAddingRecipe(true)}>
                <span className="finder-add-mark">+</span>
                Add recipe
              </button>
            </li>
            {visibleRecipes.map((recipe) => (
              <li key={recipe.id} className="finder-item">
                <button
                  type="button"
                  className="finder-tile"
                  draggable
                  aria-label={`Drag ${recipe.title} onto a meal`}
                  onClick={() => {
                    if (didDragRecipe) {
                      setDidDragRecipe(false);
                      return;
                    }
                    setViewingRecipe(recipe);
                  }}
                  onDragStart={(event) => onRecipeDragStart(event, recipe)}
                  onDragEnd={() => {
                    setDraggingRecipe(null);
                    setDropMealId(null);
                  }}
                >
                  <span className="finder-tile-top">
                    <span className="drag-handle" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="drag-hint">Drag</span>
                  </span>
                  <span className="recipe-name">
                    <RecipeEmojiMark emojis={recipeEmojis.display(recipe.emojis, recipe)} /> {recipe.title}
                  </span>
                  <span className="recipe-meta">
                    {nutritionSummary.format(recipe) || "From the pool"}
                  </span>
                </button>
                <div className="finder-actions">
                  <button type="button" className="finder-assign" onClick={() => assignRecipe(recipe)}>
                    Assign
                  </button>
                </div>
              </li>
            ))}
          </ul>
      </aside>

      {viewingRecipe ? (
        <div
          className="composer-overlay"
          onMouseDown={async (event) => {
            if (event.target !== event.currentTarget) {
              return;
            }
            const saved = await recipeDetail.current?.save();
            if (saved) {
              setViewingRecipe(null);
            }
          }}
        >
          <section className="card composer-card ingest-card">
            <div className="finder-head">
              <h2 className="section-title">Recipe</h2>
              <button type="button" className="btn btn-quiet" onClick={() => setViewingRecipe(null)}>
                Close
              </button>
            </div>
            <RecipeDetailPanel
              key={viewingRecipe.id}
              ref={recipeDetail}
              recipe={viewingRecipe}
              onSaved={(recipe) => {
                setRecipes((current) => current.map((item) => (item.id === recipe.id ? recipe : item)));
              }}
              onClose={() => setViewingRecipe(null)}
              onDeleted={(id) => {
                setRecipes((current) => current.filter((item) => item.id !== id));
                setViewingRecipe(null);
              }}
            />
          </section>
        </div>
      ) : null}

      {addingRecipe ? (
        <div
          className="composer-overlay"
          onMouseDown={async (event) => {
            if (event.target !== event.currentTarget) {
              return;
            }
            const saved = await recipeIngest.current?.saveIfReady();
            if (saved) {
              setAddingRecipe(false);
            }
          }}
        >
          <section className="card composer-card ingest-card">
            <div className="finder-head">
              <h2 className="section-title">Add a recipe</h2>
              <button type="button" className="btn btn-quiet" onClick={() => setAddingRecipe(false)}>
                Close
              </button>
            </div>
            <RecipeIngestPanel
              ref={recipeIngest}
              frameDraft={false}
              onSaved={(recipe) => {
                setRecipes((current) => [recipe, ...current.filter((item) => item.id !== recipe.id)]);
                setAddingRecipe(false);
                setViewingRecipe(recipe);
              }}
            />
          </section>
        </div>
      ) : null}

      {composer ? (
        <div className="composer-overlay">
          <section className="card composer-card">
            <h2 className="section-title">{composer.editingDishId ? "Edit dish" : "Add to this meal"}</h2>
            <div className="row">
              <label className="grow">
                Day
                <select
                  className="field"
                  value={meals.find((meal) => meal.id === composer.mealId)?.date ?? ""}
                  onChange={(event) => {
                    const current = meals.find((meal) => meal.id === composer.mealId);
                    const next = meals.find(
                      (meal) => meal.date === event.target.value && meal.slotKey === (current?.slotKey ?? slotRows[0]?.key),
                    );
                    if (next) {
                      setComposer({ ...composer, mealId: next.id });
                    }
                  }}
                >
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {weekdayLabel(day)} {dateLabel(day)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grow">
                Meal
                <select
                  className="field"
                  value={meals.find((meal) => meal.id === composer.mealId)?.slotKey ?? ""}
                  onChange={(event) => {
                    const current = meals.find((meal) => meal.id === composer.mealId);
                    const next = meals.find(
                      (meal) => meal.date === (current?.date ?? days[0]) && meal.slotKey === event.target.value,
                    );
                    if (next) {
                      setComposer({ ...composer, mealId: next.id });
                    }
                  }}
                >
                  {slotRows.map((slot) => (
                    <option key={slot.key} value={slot.key}>
                      {slot.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="choice-set">
              <legend>Content</legend>
              <label className="choice">
                <input
                  type="radio"
                  checked={composer.contentType === "recipe"}
                  onChange={() => setComposer({ ...composer, contentType: "recipe" })}
                />
                Recipe
              </label>
              <label className="choice">
                <input
                  type="radio"
                  checked={composer.contentType === "leftovers_meal"}
                  onChange={() => setComposer({ ...composer, contentType: "leftovers_meal" })}
                />
                Leftovers of a recent meal
              </label>
              <label className="choice">
                <input
                  type="radio"
                  checked={composer.contentType === "leftovers_text"}
                  onChange={() => setComposer({ ...composer, contentType: "leftovers_text" })}
                />
                Leftovers (write in)
              </label>
              <label className="choice">
                <input
                  type="radio"
                  checked={composer.contentType === "freeform"}
                  onChange={() => setComposer({ ...composer, contentType: "freeform" })}
                />
                Free-form
              </label>
            </fieldset>
            {composer.contentType === "recipe" ? (
              <label>
                Recipe
                <select
                  className="field"
                  value={composer.recipeId ?? ""}
                  onChange={(event) => {
                    const recipe = recipes.find((item) => item.id === event.target.value);
                    setComposer({
                      ...composer,
                      recipeId: event.target.value || null,
                      recipeTitle: recipe?.title ?? composer.recipeTitle,
                    });
                  }}
                >
                  <option value="">{composer.recipeTitle || "Pick from the pool"}</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {composer.contentType === "leftovers_meal" ? (
              leftovers.length === 0 ? (
                <p className="flag">No meals with dishes in the leftover window yet.</p>
              ) : (
                <label>
                  From
                  <select
                    className="field"
                    value={composer.sourceMealId ?? ""}
                    onChange={(event) => setComposer({ ...composer, sourceMealId: event.target.value || null })}
                  >
                    {leftovers.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </label>
              )
            ) : null}
            {composer.contentType === "leftovers_text" ? (
              <label>
                Leftovers
                <input
                  className="field"
                  value={composer.leftoverText}
                  onChange={(event) => setComposer({ ...composer, leftoverText: event.target.value })}
                  placeholder="Last night’s curry"
                />
              </label>
            ) : null}
            {composer.contentType === "freeform" ? (
              <label>
                What is it
                <input
                  className="field"
                  value={composer.freeformText}
                  onChange={(event) => setComposer({ ...composer, freeformText: event.target.value })}
                  placeholder="Takeaway, freezer dumplings, …"
                />
              </label>
            ) : null}
            <MealPeopleFields
              members={initialMembers}
              eaterIds={composer.eaterIds}
              cookId={composer.cookId}
              onEaters={(eaterIds) => setComposer({ ...composer, eaterIds })}
              onCook={(cookId) => setComposer({ ...composer, cookId })}
            />
            <div className="row">
              <button type="button" className="btn" disabled={busy || initialMembers.length === 0} onClick={() => void saveDish()}>
                Save on meal
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setComposer(null)}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function contentLabel(dish: PlannedDish): string {
  if (dish.contentType === "recipe") {
    return "Recipe";
  }
  if (dish.contentType === "leftovers_meal" || dish.contentType === "leftovers_text") {
    return "Leftovers";
  }
  return "Free-form";
}

function weekHeading(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function weekdayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-SG", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function dateLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function calendarGridStyle(dayCount: number): { gridTemplateColumns: string } {
  return { gridTemplateColumns: `var(--calendar-label-width) repeat(${dayCount}, minmax(0, 1fr))` };
}

function shiftWeek(weekStart: string, days: number): string {
  const date = new Date(`${weekStart}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
