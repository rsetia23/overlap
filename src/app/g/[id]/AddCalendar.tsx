"use client";

import { useState } from "react";
import s from "../../ui.module.css";

/** Adds a calendar under your name. */
export default function AddCalendar({ groupId, me, onAdded }: { groupId: string; me: string; onAdded: () => void }) {
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
      body: JSON.stringify({ ownerId: me, name, url }),
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
        Label (optional)
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Work, or Classes" maxLength={40} />
      </label>
      <label className={s.label}>
        Calendar link
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Google share link, or any iCal / webcal:// link"
          autoComplete="off"
          spellCheck={false}
          required
        />
      </label>
      <details className={s.help}>
        <summary>How do I get this from Google Calendar?</summary>
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
      <details className={s.help}>
        <summary>From Outlook?</summary>
        <ol>
          <li>
            Open <a href="https://outlook.live.com/calendar/0/options/calendar/SharedCalendars" target="_blank" rel="noreferrer">Outlook calendar settings</a>{" "}
            → <b>Shared calendars</b> (on Outlook.com or Outlook on the web; work accounts use outlook.office.com).
          </li>
          <li>
            Under <b>Publish a calendar</b>, pick your calendar and <b>Can view when I&apos;m busy</b>, then click <b>Publish</b>.
          </li>
          <li>Copy the <b>ICS</b> link and paste it here.</li>
        </ol>
      </details>
      <details className={s.help}>
        <summary>From Apple / iCloud Calendar?</summary>
        <ol>
          <li>In the Calendar app on a Mac or iPhone, or at icloud.com/calendar, open the sharing options for your calendar.</li>
          <li>
            Turn on <b>Public Calendar</b> and copy the <b>webcal://</b> link it shows, then paste it here. Note that a public
            iCloud calendar shares event names too.
          </li>
        </ol>
      </details>
      <p className={s.small}>Any other calendar app works too if it can give you an iCal (.ics) link.</p>
      {error && <p className={s.error}>{error}</p>}
      <div className={s.row}>
        <button className="primary" disabled={saving || !url.trim()}>
          {saving ? "Checking your calendar…" : "Add calendar"}
        </button>
      </div>
    </form>
  );
}
