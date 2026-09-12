"use client";

import { useState } from "react";
import { TagNormalizer } from "@/domain/recipe/TagNormalizer";

const tags = new TagNormalizer();

export function NotesTagsFields({
  notes,
  tagList,
  onNotesChange,
  onTagsChange,
}: {
  notes: string | null;
  tagList: string[];
  onNotesChange: (notes: string | null) => void;
  onTagsChange: (next: string[]) => void;
}) {
  const [draftTag, setDraftTag] = useState("");

  function addTag() {
    const next = tags.normalizeAll([...tagList, draftTag]);
    onTagsChange(next);
    setDraftTag("");
  }

  return (
    <div>
      <h3 className="list-title">Notes (optional)</h3>
      <textarea
        value={notes ?? ""}
        onChange={(event) => onNotesChange(event.target.value || null)}
        rows={3}
        placeholder="Household reminder — e.g. kid likes extra sauce"
      />
      <h3 className="list-title">Tags (optional)</h3>
      <p className="caption">Type any label (child, family, parents, spicy). Saved lowercase so Child and child match.</p>
      <div className="tag-row">
        {tagList.map((tag) => (
          <button
            key={tag}
            type="button"
            className="tag"
            onClick={() => onTagsChange(tagList.filter((item) => item !== tag))}
          >
            {tag} ×
          </button>
        ))}
      </div>
      <div className="row">
        <input
          className="grow"
          value={draftTag}
          onChange={(event) => setDraftTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder="Add a tag"
        />
        <button className="btn" type="button" onClick={addTag}>
          Add tag
        </button>
      </div>
    </div>
  );
}
