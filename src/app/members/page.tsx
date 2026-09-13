import { MembersBoard } from "@/app/MembersBoard";
import { createMemberRepository } from "@/lib/createImporter";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const members = await createMemberRepository().list();

  return (
    <>
      <header className="content-header">
        <h1 className="page-title">Members</h1>
        <p className="lede">People in this household. Later you will pick them as eaters or cooks.</p>
      </header>
      <MembersBoard initialMembers={members} />
    </>
  );
}
