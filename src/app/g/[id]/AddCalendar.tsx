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
      <h2 className={s.h2}>Add your calendar</h2>
      <label className={s.label}>
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
      </label>
      <label className={s.label}>
        Secret address in iCal format
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          autoComplete="off"
          spellCheck={false}
          required
        />
      </label>
      <details className={s.help}>
        <summary>Where do I find this?</summary>
        <ol>
          <li>
            Open <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noreferrer">Google Calendar settings</a> on a
            computer. The phone app doesn&apos;t show it.
          </li>
          <li>Under <b>Settings for my calendars</b> on the left, click your calendar.</li>
          <li>Scroll to <b>Integrate calendar</b>.</li>
          <li>
            Copy <b>Secret address in iCal format</b>.
          </li>
        </ol>
        <p className={s.small}>
          The link is stored encrypted, and only your busy times are shown to the group, never event names. You can
          turn the link off anytime with <b>Reset</b> next to it in Google Calendar. Some work and school accounts
          have this option turned off.
        </p>
      </details>
      {error && <p className={s.error}>{error}</p>}
      <div className={s.row}>
        <button className="primary" disabled={saving || !name.trim() || !url.trim()}>
          {saving ? "Reading your calendar…" : "Add calendar"}
        </button>
      </div>
    </form>
  );
}
