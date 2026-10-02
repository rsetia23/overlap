"use client";

import { useState } from "react";
import type { PublicPerson } from "@/lib/store";
import s from "../../ui.module.css";

export default function JoinGroup({ groupId, people, onPick }: { groupId: string; people: PublicPerson[]; onPick: (personId: string) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSaving(false);
    if (!res?.ok || !data?.person) {
      setError(data?.error ?? "Couldn't join. Try again.");
      return;
    }
    onPick(data.person.id);
  }

  return (
    <div className={`${s.card} ${s.stack}`} style={{ maxWidth: 420 }}>
      <h2 className={s.h2} style={{ margin: 0 }}>Who are you?</h2>
      {people.length > 0 && (
        <>
          <p className={s.muted} style={{ margin: 0 }}>Already in this group? Pick your name.</p>
          <div className={s.chips} style={{ margin: 0 }}>
            {people.map((p) => (
              <button key={p.id} type="button" className={s.chip} onClick={() => onPick(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
        </>
      )}
      <form className={s.stack} onSubmit={submit}>
        <label className={s.label}>
          {people.length ? "New here? Add your name" : "Your name"}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul" maxLength={40} required autoFocus={!people.length} />
        </label>
        {error && <p className={s.error}>{error}</p>}
        <div className={s.row}>
          <button className="primary" disabled={saving || !name.trim()}>
            {saving ? "Joining…" : "Join"}
          </button>
        </div>
      </form>
    </div>
  );
}
