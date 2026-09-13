"use client";

import { useState } from "react";
import { MemberAvatarView, ResolvedAvatarView } from "@/app/MemberAvatarView";
import { Avatar } from "@/domain/member/Avatar";
import type { AvatarMode } from "@/domain/member/AvatarMode";
import type { LifeStage } from "@/domain/member/LifeStage";
import type { MemberDraft } from "@/domain/member/MemberDraft";
import type { SavedMember } from "@/domain/member/SavedMember";

const avatars = new Avatar();

type FormState = {
  name: string;
  lifeStage: LifeStage;
  avatarMode: AvatarMode;
  avatarPresetKey: string | null;
};

const emptyForm: FormState = {
  name: "",
  lifeStage: "adult",
  avatarMode: "initials",
  avatarPresetKey: null,
};

export function MembersBoard({ initialMembers }: { initialMembers: SavedMember[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = avatars.resolve({
    id: editingId ?? (form.name || "preview"),
    name: form.name.trim() || "Name",
    avatarMode: form.avatarMode,
    avatarPresetKey: form.avatarPresetKey,
  });

  async function save(confirmDuplicate = false) {
    setBusy(true);
    setMessage(null);
    setDuplicateWarning(null);
    const draft = toDraft(form);
    const response = await fetch(editingId ? `/api/members/${editingId}` : "/api/members", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draft, confirmDuplicate }),
    });
    const result = (await response.json()) as {
      kind?: string;
      member?: SavedMember;
      error?: string;
      warning?: string;
    };
    if (result.kind === "duplicate") {
      setDuplicateWarning(result.warning ?? "That name is already on the list.");
    } else if (result.kind === "saved" && result.member) {
      setMembers((current) => upsert(current, result.member!));
      setForm(emptyForm);
      setEditingId(null);
      setMessage(editingId ? "Updated." : "Added.");
    } else {
      setMessage(result.error ?? "Could not save.");
    }
    setBusy(false);
  }

  async function remove(member: SavedMember) {
    if (!window.confirm(`Remove ${member.name} from the household list? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
    if (response.ok) {
      setMembers((current) => current.filter((row) => row.id !== member.id));
      if (editingId === member.id) {
        setForm(emptyForm);
        setEditingId(null);
      }
      setMessage("Removed.");
    } else {
      setMessage("Could not remove that person.");
    }
    setBusy(false);
  }

  function startEdit(member: SavedMember) {
    setEditingId(member.id);
    setForm({
      name: member.name,
      lifeStage: member.lifeStage,
      avatarMode: member.avatarMode,
      avatarPresetKey: member.avatarPresetKey,
    });
    setDuplicateWarning(null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setDuplicateWarning(null);
    setMessage(null);
  }

  return (
    <div className="workbench">
      <section className="card">
        <h2 className="section-title">{editingId ? "Edit member" : "Add a member"}</h2>
        <label>
          Name
          <input
            className="field"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Kai"
          />
        </label>
        <fieldset className="choice-set">
          <legend>Kid or adult</legend>
          <label className="choice">
            <input
              type="radio"
              name="lifeStage"
              checked={form.lifeStage === "adult"}
              onChange={() => setForm({ ...form, lifeStage: "adult" })}
            />
            Adult
          </label>
          <label className="choice">
            <input
              type="radio"
              name="lifeStage"
              checked={form.lifeStage === "kid"}
              onChange={() => setForm({ ...form, lifeStage: "kid" })}
            />
            Kid
          </label>
        </fieldset>
        <div className="avatar-editor">
          <p className="caption">Avatar</p>
          <div className="avatar-preview-row">
            <ResolvedAvatarView avatar={preview} name={form.name.trim() || "Name"} />
            <button
              type="button"
              className={`btn btn-quiet${form.avatarMode === "initials" ? " is-selected" : ""}`}
              onClick={() => setForm({ ...form, avatarMode: "initials", avatarPresetKey: null })}
            >
              Initials
            </button>
          </div>
          <div className="avatar-picker" role="listbox" aria-label="Built-in avatars">
            {avatars.presets().map((preset) => (
              <button
                key={preset.key}
                type="button"
                role="option"
                aria-selected={form.avatarMode === "preset" && form.avatarPresetKey === preset.key}
                className={`avatar-pick${form.avatarMode === "preset" && form.avatarPresetKey === preset.key ? " is-selected" : ""}`}
                title={preset.label}
                onClick={() => setForm({ ...form, avatarMode: "preset", avatarPresetKey: preset.key })}
              >
                {preset.glyph}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn" disabled={busy} onClick={() => void save(false)}>
            {editingId ? "Save changes" : "Add"}
          </button>
          {editingId ? (
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={cancelEdit}>
              Cancel
            </button>
          ) : null}
        </div>
        {duplicateWarning ? (
          <div className="status">
            <p className="flag">{duplicateWarning}</p>
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void save(true)}>
              Save anyway
            </button>
          </div>
        ) : null}
        {message ? <p className="status status-ok">{message}</p> : null}
      </section>

      <section className="card">
        <h2 className="section-title">Household</h2>
        {members.length === 0 ? (
          <p className="empty">Add someone</p>
        ) : (
          <ul className="member-list">
            {members.map((member) => (
              <li key={member.id} className="member-row">
                <MemberAvatarView member={member} />
                <div className="member-copy">
                  <div className="recipe-name">{member.name}</div>
                  <div className="recipe-meta">{member.lifeStage === "kid" ? "Kid" : "Adult"}</div>
                </div>
                <div className="member-actions">
                  <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => startEdit(member)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void remove(member)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function toDraft(form: FormState): MemberDraft {
  return {
    name: form.name,
    lifeStage: form.lifeStage,
    avatarMode: form.avatarMode,
    avatarPresetKey: form.avatarMode === "preset" ? form.avatarPresetKey : null,
  };
}

function upsert(members: SavedMember[], next: SavedMember): SavedMember[] {
  const without = members.filter((member) => member.id !== next.id);
  return [...without, next].sort((left, right) => left.name.localeCompare(right.name));
}
