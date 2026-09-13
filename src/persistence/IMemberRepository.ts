import type { MemberDraft } from "@/domain/member/MemberDraft";
import type { SavedMember } from "@/domain/member/SavedMember";

export type DuplicateMemberWarning = {
  existingId: string;
  existingName: string;
};

export interface IMemberRepository {
  list(): Promise<SavedMember[]>;
  getById(id: string): Promise<SavedMember | null>;
  findDuplicateName(name: string, exceptId?: string): Promise<DuplicateMemberWarning | null>;
  create(draft: MemberDraft): Promise<SavedMember>;
  update(id: string, draft: MemberDraft): Promise<SavedMember | null>;
  remove(id: string): Promise<boolean>;
}
