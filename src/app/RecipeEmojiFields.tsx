"use client";

import { RecipeEmojiAssigner } from "@/domain/recipe/RecipeEmojiAssigner";

const assigner = new RecipeEmojiAssigner();

export function RecipeEmojiFields({
  emojis,
  onChange,
}: {
  emojis: string[];
  onChange: (emojis: string[]) => void;
}) {
  const selected = assigner.clamp(emojis);

  function toggle(emoji: string) {
    if (selected.includes(emoji)) {
      onChange(selected.filter((item) => item !== emoji));
      return;
    }
    if (selected.length >= assigner.max()) {
      return;
    }
    onChange([...selected, emoji]);
  }

  return (
    <div className="emoji-fields">
      <p className="caption">Up to {assigner.max()} icons. Click to add or remove.</p>
      <div className="emoji-selected" aria-label="Selected recipe emojis">
        {selected.length === 0 ? <span className="recipe-meta">None yet</span> : null}
        {selected.map((emoji) => (
          <button key={emoji} type="button" className="emoji-chip is-on" onClick={() => toggle(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
      <div className="emoji-palette" role="listbox" aria-label="Recipe emoji palette">
        {assigner.palette().map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="option"
            aria-selected={selected.includes(emoji)}
            className={`emoji-chip${selected.includes(emoji) ? " is-on" : ""}`}
            disabled={!selected.includes(emoji) && selected.length >= assigner.max()}
            onClick={() => toggle(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RecipeEmojiMark({ emojis }: { emojis: string[] }) {
  if (emojis.length === 0) {
    return null;
  }
  return <span className="emoji-mark">{emojis.join(" ")}</span>;
}
