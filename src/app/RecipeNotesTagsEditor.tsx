"use client";

import { useState } from "react";
import { NotesTagsFields } from "@/app/NotesTagsFields";

export function RecipeNotesTagsEditor({
  recipeId,
  initialNotes,
  initialTags,
}: {
  recipeId: string;
  initialNotes: string | null;
  initialTags: string[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [tagList, setTagList] = useState(initialTags);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const response = await fetch(`/api/recipes/${recipeId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes, tags: tagList }),
    });
    const result = (await response.json()) as { recipe?: { notes: string | null; tags: string[] }; error?: string };
    if (result.recipe) {
      setNotes(result.recipe.notes);
      setTagList(result.recipe.tags);
      setMessage("Notes and tags saved.");
    } else {
      setMessage(result.error ?? "Could not save.");
    }
    setBusy(false);
  }

  return (
    <section className="review">
      <NotesTagsFields notes={notes} tagList={tagList} onNotesChange={setNotes} onTagsChange={setTagList} />
      <div className="row">
        <button className="btn" type="button" onClick={() => void save()} disabled={busy}>
          Save notes and tags
        </button>
      </div>
      {message ? (
        <p className={`status ${message.includes("saved") ? "status-ok" : ""}`} role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
