"use client";

import type { SavedMember } from "@/domain/member/SavedMember";

export function MealPeopleFields({
  members,
  eaterIds,
  cookId,
  onEaters,
  onCook,
}: {
  members: SavedMember[];
  eaterIds: string[];
  cookId: string;
  onEaters: (ids: string[]) => void;
  onCook: (id: string) => void;
}) {
  if (members.length === 0) {
    return (
      <p className="flag">
        Add people on <a href="/members">Members</a> before you can set eaters and a cook.
      </p>
    );
  }

  return (
    <>
      <fieldset className="choice-set">
        <legend>Who eats (optional)</legend>
        {members.map((member) => (
          <label key={member.id} className="choice">
            <input
              type="checkbox"
              checked={eaterIds.includes(member.id)}
              onChange={() => onEaters(toggle(eaterIds, member.id))}
            />
            {member.name}
          </label>
        ))}
      </fieldset>
      <label>
        Who cooks (optional)
        <select className="field" value={cookId} onChange={(event) => onCook(event.target.value)}>
          <option value="">No cook yet</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
