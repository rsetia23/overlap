"use client";

import { useState } from "react";
import s from "../../ui.module.css";

export default function AddCalendar({ groupId, onAdded }: { groupId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setError(data?.error ?? "Couldn't add that calendar. Try again.");
      return;
    }
    setName("");
    setUrl("");
    onAdded();
  }

  return (
    <form className={`${s.card} ${s.stack}`} onSubmit={submit}>
      <h2 className={s.h2}>Add a calendar</h2>
      <label className={s.label}>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul, or Classes" maxLength={40} required />
      </label>
      <label className={s.label}>
        Calendar link
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://calendar.google.com/calendar/u/0?cid=…"
          autoComplete="off"
          spellCheck={false}
          required
        />
      </label>
      <details className={s.help}>
        <summary>How do I get this?</summary>
        <ol>
          <li>
            Open <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noreferrer">Google Calendar settings</a> on a
            computer. The phone app doesn&apos;t show these options.
          </li>
          <li>Under <b>Settings for my calendars</b> on the left, click your calendar.</li>
          <li>
            In <b>Access permissions for events</b>, tick <b>Make available to public</b> and choose{" "}
            <b>See only free/busy (hide details)</b>.
          </li>
          <li>
            Click <b>Get shareable link</b>, copy it, and paste it here.
          </li>
        </ol>
        <p className={s.small}>
          Shared this way, your calendar only shows <i>when</i> you&apos;re busy. No event names, places, or guests.
          Those busy times are public to anyone who has the link or knows your email, so if you&apos;d rather keep
          them private, paste your <b>Secret address in iCal format</b> from <b>Integrate calendar</b> instead. Some
          work and school accounts don&apos;t allow either option.
        </p>
      </details>
      {error && <p className={s.error}>{error}</p>}
      <div className={s.row}>
        <button className="primary" disabled={saving || !name.trim() || !url.trim()}>
          {saving ? "Checking your calendar…" : "Add calendar"}
        </button>
      </div>
    </form>
  );
}
