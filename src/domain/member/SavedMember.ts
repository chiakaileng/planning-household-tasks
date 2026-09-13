import type { AvatarMode } from "@/domain/member/AvatarMode";
import type { LifeStage } from "@/domain/member/LifeStage";

export type SavedMember = {
  id: string;
  name: string;
  lifeStage: LifeStage;
  avatarMode: AvatarMode;
  avatarPresetKey: string | null;
};
