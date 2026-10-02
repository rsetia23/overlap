"use client";

import { useState } from "react";
import type { PublicMember } from "@/lib/store";
import s from "../../ui.module.css";

/** Someone in the group and their calendars. `unowned` marks a calendar added before people existed. */
export type Person = { id: string; name: string; calendars: PublicMember[]; unowned?: boolean };

type Props = {
  groupId: string;
  people: Person[];
  me: string | null;
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

type Editable = { canRename: boolean; canRemove: boolean };

function CalendarRow({
  groupId,
  member,
  error,
  onChanged,
  canRename,
  canRemove,
}: { groupId: string; member: PublicMember; error: string | null; onChanged: () => void } & Editable) {
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
    const res = await fetch(`/api/groups/${groupId}/members?memberId=${encodeURIComponent(member.id)}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setSaveError(data?.error ?? "Couldn't remove. Try again.");
      return;
    }
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
          {canRename && (
            <button type="button" className={s.iconButton} onClick={startEdit} aria-label={`Rename ${member.name}`} title="Rename">
              <PencilIcon />
            </button>
          )}
          {canRemove && (
            <button type="button" className={`${s.link} ${s.danger}`} onClick={remove} aria-label={`Remove ${member.name}`}>
              Remove
            </button>
          )}
        </div>
      )}
      {saveError && <div className={`${s.error} ${s.rowNote}`}>{saveError}</div>}
      {error && <div className={`${s.error} ${s.rowNote}`}>{error} Not counted for now.</div>}
    </li>
  );
}

function MyName({ groupId, personId, name, onChanged }: { groupId: string; personId: string; name: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next = draft.trim();
    if (!next || next === name) return setEditing(false);
    const res = await fetch(`/api/groups/${groupId}/people`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, name: next }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) return setError(data?.error ?? "Couldn't rename. Try again.");
    setEditing(false);
    onChanged();
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={s.link}
        onClick={(e) => {
          e.preventDefault(); // don't toggle the dropdown
          setDraft(name);
          setError(null);
          setEditing(true);
        }}
      >
        Edit name
      </button>
    );
  }
  return (
    <form className={s.member} onSubmit={save}>
      <input
        className={s.renameInput}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        maxLength={40}
        aria-label="Your name"
        autoFocus
      />
      <button className={s.link}>Save</button>
      <button type="button" className={s.link} onClick={() => setEditing(false)}>
        Cancel
      </button>
      {error && <span className={s.error}>{error}</span>}
    </form>
  );
}

function PersonRow({ groupId, person, isMe, errorOf, onChanged }: { groupId: string; person: Person; isMe: boolean; errorOf: Props["errorOf"]; onChanged: () => void }) {
  const errors = person.calendars.filter((m) => errorOf(m.id)).length;
  const allFailing = person.calendars.length > 0 && errors === person.calendars.length;
  const count = person.calendars.length;
  return (
    <li>
      <details className={s.person} open={isMe}>
        <summary className={s.member}>
          <span className={`${s.dot} ${allFailing || (errors && !count) ? s.dotErr : count ? "" : s.dotIdle}`} />
          <span className={s.memberName}>
            {person.name}
            {isMe && <span className={s.small}> (you)</span>}
          </span>
          <span className={`${s.small} ${errors ? s.errorText : ""}`}>
            {errors ? `${errors} not loading` : count === 0 ? "no calendars" : `${count} ${count === 1 ? "calendar" : "calendars"}`}
          </span>
        </summary>
        <div className={s.personBody}>
          {count === 0 ? (
            <p className={s.small} style={{ margin: 0 }}>
              {isMe ? "Add a calendar below so you're counted." : "No calendar yet, so not counted."}
            </p>
          ) : (
            <ul className={s.members}>
              {person.calendars.map((m) => (
                <CalendarRow
                  key={m.id}
                  groupId={groupId}
                  member={m}
                  error={errorOf(m.id)}
                  onChanged={onChanged}
                  canRename={isMe}
                  canRemove={isMe || !!person.unowned}
                />
              ))}
            </ul>
          )}
          {isMe && <MyName groupId={groupId} personId={person.id} name={person.name} onChanged={onChanged} />}
          {person.unowned && <p className={s.small} style={{ margin: 0 }}>Added before names were required, so anyone can remove it.</p>}
        </div>
      </details>
    </li>
  );
}

export default function CalendarList({ groupId, people, me, errorOf, onChanged }: Props) {
  if (!people.length) return <p className={s.muted}>No one has joined yet.</p>;
  // You first, then everyone else in join order.
  const sorted = [...people].sort((a, b) => Number(b.id === me) - Number(a.id === me));
  return (
    <ul className={s.members}>
      {sorted.map((p) => (
        <PersonRow key={p.id} groupId={groupId} person={p} isMe={p.id === me} errorOf={errorOf} onChanged={onChanged} />
      ))}
    </ul>
  );
}
