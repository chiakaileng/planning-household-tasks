/**
 * Avatar tunables only. Pages and domain helpers read this; they do not invent
 * colors or preset faces. Change the lists here when the set should grow or shrink.
 */
export type PresetAvatar = {
  key: string;
  label: string;
  glyph: string;
};

export type MemberAvatarCatalog = {
  initialsColors: readonly string[];
  presets: readonly PresetAvatar[];
};

export const memberAvatarCatalog: MemberAvatarCatalog = {
  initialsColors: ["#635bff", "#0a2540", "#0c8f5a", "#c4314b", "#0d74ce", "#b46a00"],
  presets: [
    { key: "smile", label: "Smile", glyph: "😊" },
    { key: "grin", label: "Grin", glyph: "😄" },
    { key: "cool", label: "Cool", glyph: "😎" },
    { key: "think", label: "Think", glyph: "🤔" },
    { key: "star", label: "Star", glyph: "⭐" },
    { key: "sun", label: "Sun", glyph: "☀️" },
    { key: "cat", label: "Cat", glyph: "🐱" },
    { key: "bear", label: "Bear", glyph: "🐻" },
  ],
};
