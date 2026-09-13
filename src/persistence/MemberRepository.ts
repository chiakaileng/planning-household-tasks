import type { PrismaClient } from "@prisma/client";
import { isAvatarMode } from "@/domain/member/AvatarMode";
import type { MemberDraft } from "@/domain/member/MemberDraft";
import { MemberName } from "@/domain/member/MemberName";
import { isLifeStage } from "@/domain/member/LifeStage";
import type { SavedMember } from "@/domain/member/SavedMember";
import type { DuplicateMemberWarning, IMemberRepository } from "@/persistence/IMemberRepository";

export class MemberRepository implements IMemberRepository {
  private readonly names = new MemberName();

  constructor(private readonly db: PrismaClient) {}

  async list(): Promise<SavedMember[]> {
    const rows = await this.db.member.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toSaved);
  }

  async getById(id: string): Promise<SavedMember | null> {
    const row = await this.db.member.findUnique({ where: { id } });
    return row ? toSaved(row) : null;
  }

  async findDuplicateName(name: string, exceptId?: string): Promise<DuplicateMemberWarning | null> {
    const parsed = this.names.parse(name);
    if (!parsed) {
      return null;
    }
    const rows = await this.db.member.findMany({
      select: { id: true, name: true },
    });
    const match = rows.find(
      (row) => row.id !== exceptId && this.names.sameIgnoreCase(row.name, parsed),
    );
    return match ? { existingId: match.id, existingName: match.name } : null;
  }

  async create(draft: MemberDraft): Promise<SavedMember> {
    const data = this.requireDraft(draft);
    const created = await this.db.member.create({ data });
    return toSaved(created);
  }

  async update(id: string, draft: MemberDraft): Promise<SavedMember | null> {
    const existing = await this.db.member.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    const data = this.requireDraft(draft);
    const updated = await this.db.member.update({ where: { id }, data });
    return toSaved(updated);
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.db.member.findUnique({ where: { id } });
    if (!existing) {
      return false;
    }
    await this.db.member.delete({ where: { id } });
    return true;
  }

  private requireDraft(draft: MemberDraft): {
    name: string;
    lifeStage: string;
    avatarMode: string;
    avatarPresetKey: string | null;
  } {
    const name = this.names.parse(draft.name);
    if (!name) {
      throw new Error("Name is required.");
    }
    if (!isLifeStage(draft.lifeStage)) {
      throw new Error("Kid or adult is required.");
    }
    if (!isAvatarMode(draft.avatarMode)) {
      throw new Error("Avatar is required.");
    }
    const avatarPresetKey =
      draft.avatarMode === "preset" ? draft.avatarPresetKey?.trim() || null : null;
    if (draft.avatarMode === "preset" && !avatarPresetKey) {
      throw new Error("Pick an avatar from the set, or use initials.");
    }
    return {
      name,
      lifeStage: draft.lifeStage,
      avatarMode: draft.avatarMode,
      avatarPresetKey,
    };
  }
}

type MemberRow = {
  id: string;
  name: string;
  lifeStage: string;
  avatarMode: string;
  avatarPresetKey: string | null;
};

function toSaved(row: MemberRow): SavedMember {
  if (!isLifeStage(row.lifeStage) || !isAvatarMode(row.avatarMode)) {
    throw new Error(`Member ${row.id} has an invalid life stage or avatar.`);
  }
  return {
    id: row.id,
    name: row.name,
    lifeStage: row.lifeStage,
    avatarMode: row.avatarMode,
    avatarPresetKey: row.avatarPresetKey,
  };
}
