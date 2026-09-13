"use client";

import { useState } from "react";
import { NotesTagsFields } from "@/app/NotesTagsFields";
import { RecipeEmojiFields } from "@/app/RecipeEmojiFields";

export function RecipeNotesTagsEditor({
  recipeId,
  initialNotes,
  initialTags,
  initialEmojis,
}: {
  recipeId: string;
  initialNotes: string | null;
  initialTags: string[];
  initialEmojis: string[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [tagList, setTagList] = useState(initialTags);
  const [emojis, setEmojis] = useState(initialEmojis);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const response = await fetch(`/api/recipes/${recipeId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes, tags: tagList, emojis }),
    });
    const result = (await response.json()) as {
      recipe?: { notes: string | null; tags: string[]; emojis: string[] };
      error?: string;
    };
    if (result.recipe) {
      setNotes(result.recipe.notes);
      setTagList(result.recipe.tags);
      setEmojis(result.recipe.emojis);
      setMessage("Notes, tags, and icons saved.");
    } else {
      setMessage(result.error ?? "Could not save.");
    }
    setBusy(false);
  }

  return (
    <section className="review">
      <RecipeEmojiFields emojis={emojis} onChange={setEmojis} />
      <NotesTagsFields notes={notes} tagList={tagList} onNotesChange={setNotes} onTagsChange={setTagList} />
      <div className="row">
        <button className="btn" type="button" onClick={() => void save()} disabled={busy}>
          Save notes, tags, and icons
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
