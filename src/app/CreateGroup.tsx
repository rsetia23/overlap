"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { rememberMe } from "./g/[id]/me";
import s from "./ui.module.css";

export default function CreateGroup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [you, setYou] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, you }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.id) {
      setError(data?.error ?? "Couldn't create the group. Try again.");
      setBusy(false);
      return;
    }
    if (data.me?.id) rememberMe(data.id, data.me.id);
    router.push(`/g/${data.id}`);
  }

  return (
    <form className={`${s.card} ${s.stack}`} onSubmit={submit}>
      <label className={s.label}>
        Group name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Friday dinner crew" maxLength={60} required autoFocus />
      </label>
      <label className={s.label}>
        Your name
        <input value={you} onChange={(e) => setYou(e.target.value)} placeholder="e.g. Rahul" maxLength={40} required />
      </label>
      {error && <p className={s.error}>{error}</p>}
      <div className={s.row}>
        <button className="primary" disabled={busy || !name.trim() || !you.trim()}>
          {busy ? "Creating…" : "Create group"}
        </button>
      </div>
    </form>
  );
}
