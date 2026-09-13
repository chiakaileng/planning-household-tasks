import { memberAvatarCatalog, type MemberAvatarCatalog, type PresetAvatar } from "@/config/memberAvatars";
import type { AvatarMode } from "@/domain/member/AvatarMode";

export type ResolvedAvatar =
  | { mode: "initials"; initials: string; color: string }
  | { mode: "preset"; key: string; glyph: string; label: string };

type AvatarInput = {
  id: string;
  name: string;
  avatarMode: AvatarMode;
  avatarPresetKey: string | null;
};

/**
 * Shared initials + preset resolution. If a stored preset key leaves the catalog,
 * fall back to initials so old rows still render.
 */
export class Avatar {
  constructor(private readonly catalog: MemberAvatarCatalog = memberAvatarCatalog) {}

  initialsFromName(name: string): string {
    const words = name.trim().split(/\s+/).filter((word) => word.length > 0);
    if (words.length === 0) {
      return "";
    }
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  colorForId(id: string): string {
    const colors = this.catalog.initialsColors;
    if (colors.length === 0) {
      throw new Error("Member avatar catalog must list at least one initials color.");
    }
    let hash = 0;
    for (const character of id) {
      hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }
    return colors[hash % colors.length];
  }

  presets(): readonly PresetAvatar[] {
    return this.catalog.presets;
  }

  resolve(member: AvatarInput): ResolvedAvatar {
    if (member.avatarMode === "preset" && member.avatarPresetKey) {
      const preset = this.catalog.presets.find((item) => item.key === member.avatarPresetKey);
      if (preset) {
        return { mode: "preset", key: preset.key, glyph: preset.glyph, label: preset.label };
      }
    }
    return {
      mode: "initials",
      initials: this.initialsFromName(member.name),
      color: this.colorForId(member.id),
    };
  }
}
