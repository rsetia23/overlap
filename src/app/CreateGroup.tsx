"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import s from "./ui.module.css";

export default function CreateGroup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.id) {
      setError(data?.error ?? "Couldn't create the group. Try again.");
      setBusy(false);
      return;
    }
    router.push(`/g/${data.id}`);
  }

  return (
    <form className={`${s.card} ${s.stack}`} onSubmit={submit}>
      <label className={s.label}>
        Group name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Friday dinner crew" maxLength={60} required autoFocus />
      </label>
      {error && <p className={s.error}>{error}</p>}
      <div className={s.row}>
        <button className="primary" disabled={busy || !name.trim()}>
          {busy ? "Creating…" : "Create group"}
        </button>
      </div>
    </form>
  );
}
