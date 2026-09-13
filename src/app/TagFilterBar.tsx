"use client";

export function TagFilterBar({
  tags,
  selected,
  onToggle,
  onClear,
}: {
  tags: string[];
  selected: readonly string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="tag-row">
      <button type="button" className={`tag${selected.length === 0 ? " is-selected" : ""}`} onClick={onClear}>
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={`tag${selected.includes(tag) ? " is-selected" : ""}`}
          onClick={() => onToggle(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
