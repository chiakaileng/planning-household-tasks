import { isAvatarMode } from "@/domain/member/AvatarMode";
import type { MemberDraft } from "@/domain/member/MemberDraft";
import { isLifeStage } from "@/domain/member/LifeStage";
import { MemberName } from "@/domain/member/MemberName";

const names = new MemberName();

export function parseMemberDraft(raw: MemberDraft | undefined): MemberDraft | null {
  if (!raw) {
    return null;
  }
  const name = names.parse(raw.name);
  if (!name || !isLifeStage(raw.lifeStage) || !isAvatarMode(raw.avatarMode)) {
    return null;
  }
  const avatarPresetKey = raw.avatarMode === "preset" ? raw.avatarPresetKey?.trim() || null : null;
  if (raw.avatarMode === "preset" && !avatarPresetKey) {
    return null;
  }
  return {
    name,
    lifeStage: raw.lifeStage,
    avatarMode: raw.avatarMode,
    avatarPresetKey,
  };
}
