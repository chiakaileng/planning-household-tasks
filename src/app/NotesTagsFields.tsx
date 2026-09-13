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

  function addTag(raw = draftTag) {
    const next = tags.normalizeAll([...tagList, raw]);
    onTagsChange(next);
    setDraftTag("");
  }

  function onDraftChange(value: string) {
    if (!value.includes(",")) {
      setDraftTag(value);
      return;
    }
    const pieces = value.split(",");
    const rest = pieces.pop() ?? "";
    const completed = tags.normalizeAll([...tagList, ...pieces]);
    onTagsChange(completed);
    setDraftTag(rest);
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
      <p className="caption">Comma-separated labels (child, family, spicy). Saved lowercase so Child and child match.</p>
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
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder="child, family, spicy"
        />
        <button className="btn" type="button" onClick={() => addTag()}>
          Add tag
        </button>
      </div>
    </div>
  );
}
