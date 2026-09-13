import { afterAll, describe, expect, it } from "vitest";
import type { MemberDraft } from "@/domain/member/MemberDraft";
import { prisma } from "@/persistence/prisma";
import { MemberRepository } from "@/persistence/MemberRepository";

function draft(overrides: Partial<MemberDraft> = {}): MemberDraft {
  return {
    name: `Test ${Date.now()}-${Math.random()}`,
    lifeStage: "adult",
    avatarMode: "initials",
    avatarPresetKey: null,
    ...overrides,
  };
}

describe("MemberRepository", () => {
  const repo = new MemberRepository(prisma);
  const createdIds: string[] = [];

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.member.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.$disconnect();
  });

  it("saves, lists, edits, and removes a member", async () => {
    const created = await repo.create(draft({ name: "  Kai Leng  ", lifeStage: "kid" }));
    createdIds.push(created.id);

    expect(created.name).toBe("Kai Leng");
    expect(created.lifeStage).toBe("kid");
    expect(created.avatarMode).toBe("initials");

    const listed = await repo.list();
    expect(listed.some((member) => member.id === created.id)).toBe(true);

    const updated = await repo.update(created.id, {
      name: "Kai",
      lifeStage: "adult",
      avatarMode: "preset",
      avatarPresetKey: "smile",
    });
    expect(updated?.name).toBe("Kai");
    expect(updated?.lifeStage).toBe("adult");
    expect(updated?.avatarMode).toBe("preset");
    expect(updated?.avatarPresetKey).toBe("smile");

    const removed = await repo.remove(created.id);
    expect(removed).toBe(true);
    expect(await repo.getById(created.id)).toBeNull();
  });

  it("rejects an empty name", async () => {
    await expect(repo.create(draft({ name: "   " }))).rejects.toThrow("Name is required.");
  });

  it("finds a duplicate name ignoring case", async () => {
    const created = await repo.create(draft({ name: "UniqueMemberKai" }));
    createdIds.push(created.id);
    const duplicate = await repo.findDuplicateName(" uniquememberkai ");
    expect(duplicate?.existingId).toBe(created.id);
    expect(await repo.findDuplicateName("UniqueMemberKai", created.id)).toBeNull();
  });
});
