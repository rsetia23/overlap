"use client";

import { useState } from "react";
import type { PublicMember } from "@/lib/store";
import s from "../../ui.module.css";

type Props = {
  groupId: string;
  members: PublicMember[];
  errorOf: (id: string) => string | null;
  onChanged: () => void;
};

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M11.5 2.5l2 2L6 12H4v-2l7.5-7.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarRow({ groupId, member, error, onChanged }: { groupId: string; member: PublicMember; error: string | null; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(member.name);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function startEdit() {
    setDraft(member.name);
    setSaveError(null);
    setEditing(true);
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    const name = draft.trim();
    if (!name || name === member.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, name }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setSaveError(data?.error ?? "Couldn't rename. Try again.");
      return;
    }
    setEditing(false);
    onChanged();
  }

  async function remove() {
    if (!window.confirm(`Remove "${member.name}" from this group?`)) return;
    await fetch(`/api/groups/${groupId}/members?memberId=${encodeURIComponent(member.id)}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <li>
      {editing ? (
        <form className={s.member} onSubmit={save}>
          <span className={`${s.dot} ${error ? s.dotErr : ""}`} />
          <input
            className={s.renameInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            maxLength={40}
            aria-label="Calendar name"
            autoFocus
            disabled={saving}
          />
          <button className={s.link} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className={s.link} onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
        </form>
      ) : (
        <div className={s.member}>
          <span className={`${s.dot} ${error ? s.dotErr : ""}`} />
          <span className={s.memberName}>{member.name}</span>
          <button type="button" className={s.iconButton} onClick={startEdit} aria-label={`Rename ${member.name}`} title="Rename">
            <PencilIcon />
          </button>
          <button type="button" className={`${s.link} ${s.danger}`} onClick={remove} aria-label={`Remove ${member.name}`}>
            Remove
          </button>
        </div>
      )}
      {saveError && <div className={`${s.error} ${s.rowNote}`}>{saveError}</div>}
      {error && <div className={`${s.error} ${s.rowNote}`}>{error} Not counted for now.</div>}
    </li>
  );
}

export default function CalendarList({ groupId, members, errorOf, onChanged }: Props) {
  if (!members.length) return <p className={s.muted}>No calendars yet.</p>;
  return (
    <ul className={s.members}>
      {members.map((m) => (
        <CalendarRow key={m.id} groupId={groupId} member={m} error={errorOf(m.id)} onChanged={onChanged} />
      ))}
    </ul>
  );
}
