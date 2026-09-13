export const AVATAR_MODES = ["initials", "preset"] as const;

export type AvatarMode = (typeof AVATAR_MODES)[number];

export function isAvatarMode(value: string): value is AvatarMode {
  return (AVATAR_MODES as readonly string[]).includes(value);
}
