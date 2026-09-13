import { NextResponse } from "next/server";
import type { MemberDraft } from "@/domain/member/MemberDraft";
import { parseMemberDraft } from "@/app/api/members/parseMemberDraft";
import { createMemberRepository } from "@/lib/createImporter";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { draft?: MemberDraft; confirmDuplicate?: boolean };
  const draft = parseMemberDraft(body.draft);
  if (!draft) {
    return NextResponse.json({ error: "Name and kid or adult are required." }, { status: 400 });
  }

  const repo = createMemberRepository();
  const existing = await repo.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "That person is not on the list." }, { status: 404 });
  }

  const duplicate = await repo.findDuplicateName(draft.name, id);
  if (duplicate && !body.confirmDuplicate) {
    return NextResponse.json({
      kind: "duplicate",
      warning: `Someone named “${duplicate.existingName}” is already on the list. Save anyway if they are a different person.`,
      existingId: duplicate.existingId,
    });
  }

  const member = await repo.update(id, draft);
  return NextResponse.json({ kind: "saved", member });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const removed = await createMemberRepository().remove(id);
  if (!removed) {
    return NextResponse.json({ error: "That person is not on the list." }, { status: 404 });
  }
  return NextResponse.json({ kind: "removed" });
}
