import { NextResponse } from "next/server";
import { parseMemberDraft } from "@/app/api/members/parseMemberDraft";
import type { MemberDraft } from "@/domain/member/MemberDraft";
import { createMemberRepository } from "@/lib/createImporter";

export async function GET() {
  const members = await createMemberRepository().list();
  return NextResponse.json({ members });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { draft?: MemberDraft; confirmDuplicate?: boolean };
  const draft = parseMemberDraft(body.draft);
  if (!draft) {
    return NextResponse.json({ error: "Name and kid or adult are required." }, { status: 400 });
  }

  const repo = createMemberRepository();
  const duplicate = await repo.findDuplicateName(draft.name);
  if (duplicate && !body.confirmDuplicate) {
    return NextResponse.json({
      kind: "duplicate",
      warning: `Someone named “${duplicate.existingName}” is already on the list. Save anyway if they are a different person.`,
      existingId: duplicate.existingId,
    });
  }

  const member = await repo.create(draft);
  return NextResponse.json({ kind: "saved", member });
}
