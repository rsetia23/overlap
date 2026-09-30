"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BusyResponse } from "@/app/api/groups/[id]/busy/route";
import type { Interval } from "@/lib/intervals";
import { buildGrid, findWindows, type Window } from "@/lib/slots";
import type { PublicMember } from "@/lib/store";
import s from "../../ui.module.css";
import AddCalendar from "./AddCalendar";
import CalendarList from "./CalendarList";
import { fmtDuration, fmtHour, fmtRange, fromInputDate, listNames, toInputDate } from "./format";
import Heatmap from "./Heatmap";

const SLOT_MINUTES = 30;
const WINDOW_DAYS = 42; // must match busyWindow() on the server
const HOURS = Array.from({ length: 25 }, (_, h) => h);
const LENGTHS = [30, 60, 90, 120, 180, 240];
// Monday-first, as JS getDay() numbers.
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0].map((n) => ({
  n,
  label: new Date(2026, 0, 4 + n).toLocaleDateString(undefined, { weekday: "short" }),
}));

export default function GroupView({ id, name }: { id: string; name: string }) {
  const [members, setMembers] = useState<PublicMember[] | null>(null);
  const [busy, setBusy] = useState<BusyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [startDate, setStartDate] = useState(() => toInputDate(new Date()));
  const [numDays, setNumDays] = useState(7);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(23);
  const [minMinutes, setMinMinutes] = useState(60);
  const [weekdays, setWeekdays] = useState<Set<number>>(() => new Set(WEEKDAYS.map((d) => d.n)));
  // Captured once per load so rendering stays pure; refreshed with the data.
  const [now, setNow] = useState(() => Date.now());

  // Resolves to a state update to apply, so the mount effect only sets state
  // in the async callback.
  const fetchAll = useCallback(
    async (refresh: boolean) => {
      try {
        const [g, b] = await Promise.all([
          fetch(`/api/groups/${id}`).then((r) => r.json()),
          fetch(`/api/groups/${id}/busy${refresh ? "?refresh=1" : ""}`).then((r) => r.json()),
        ]);
        return () => {
          setMembers(g.members ?? []);
          setBusy(b);
          setNow(Date.now());
          setLoadError(null);
        };
      } catch {
        return () => setLoadError("Couldn't load calendars. Check your connection and refresh.");
      }
    },
    [id],
  );

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      (await fetchAll(refresh))();
      setLoading(false);
    },
    [fetchAll],
  );

  useEffect(() => {
    let live = true;
    fetchAll(false).then((apply) => live && apply());
    return () => {
      live = false;
    };
  }, [fetchAll]);

  const ok = useMemo(() => {
    const out: Record<string, Interval[]> = {};
    for (const m of members ?? []) {
      const r = busy?.members[m.id];
      if (r && "busy" in r) out[m.id] = r.busy;
    }
    return out;
  }, [members, busy]);
  const okCount = Object.keys(ok).length;
  const nameOf = useCallback((mid: string) => members?.find((m) => m.id === mid)?.name ?? "?", [members]);

  const days = useMemo(
    () =>
      buildGrid(
        { firstDay: fromInputDate(startDate), numDays, startHour, endHour: Math.max(endHour, startHour + 1), slotMinutes: SLOT_MINUTES },
        ok,
      ),
    [startDate, numDays, startHour, endHour, ok],
  );

  const { windows, required } = useMemo(() => {
    // Past slots count as unavailable so suggestions start from now.
    const future = days.filter((d) => weekdays.has(d.date.getDay())).map((d) => ({
      ...d,
      slots: d.slots.map((sl) => (sl.end <= now ? { ...sl, free: [], busy: Object.keys(ok) } : sl)),
    }));
    let req = okCount;
    let w: Window[] = okCount ? findWindows(future, okCount, minMinutes) : [];
    // Nothing works for everyone: fall back to times that work for all but one.
    if (!w.length && okCount >= 3) {
      req = okCount - 1;
      w = findWindows(future, req, minMinutes);
    }
    return { windows: w.slice(0, 12), required: req };
  }, [days, ok, okCount, minMinutes, now, weekdays]);

  function toggleWeekday(n: number) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const today = toInputDate(new Date(now));
  const lastStart = toInputDate(new Date(now + (WINDOW_DAYS - numDays) * 86_400_000));

  return (
    <main className={s.page}>
      <Link href="/" className={s.brand}>
        Overlap
      </Link>
      <h1 className={s.title}>{name}</h1>
      <p className={s.sub}>
        {members === null
          ? "Loading…"
          : members.length === 0
            ? "No calendars yet. Add yours, then send this link to your friends."
            : `${members.length} ${members.length === 1 ? "calendar" : "calendars"} · times shown in your timezone`}
      </p>

      <div className={s.layout}>
        <section className={s.card}>
          <div className={s.controls}>
            <label className={s.label}>
              Starting
              <input type="date" value={startDate} min={today} max={lastStart} onChange={(e) => e.target.value && setStartDate(e.target.value)} />
            </label>
            <label className={s.label}>
              Days
              <select value={numDays} onChange={(e) => setNumDays(Number(e.target.value))}>
                {[3, 5, 7, 10, 14].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className={s.label}>
              From
              <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}>
                {HOURS.slice(0, 24).map((h) => (
                  <option key={h} value={h}>{fmtHour(h)}</option>
                ))}
              </select>
            </label>
            <label className={s.label}>
              To
              <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}>
                {HOURS.slice(1).map((h) => (
                  <option key={h} value={h} disabled={h <= startHour}>{h === 24 ? "midnight" : fmtHour(h)}</option>
                ))}
              </select>
            </label>
            <label className={s.label}>
              At least
              <select value={minMinutes} onChange={(e) => setMinMinutes(Number(e.target.value))}>
                {LENGTHS.map((m) => (
                  <option key={m} value={m}>{fmtDuration(m * 60_000)}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => load(true)} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh calendars"}
            </button>
          </div>
          {loadError && <p className={s.error}>{loadError}</p>}
          {okCount === 0 ? (
            <div className={s.empty}>{members === null ? "Loading calendars…" : "Once someone adds a calendar, their busy times show up here."}</div>
          ) : (
            <Heatmap days={days} total={okCount} now={now} nameOf={nameOf} />
          )}
        </section>

        <div className={s.side}>
          <section className={s.card}>
            <h2 className={s.h2}>{required === okCount ? "Everyone's free" : `Free for ${required} of ${okCount}`}</h2>
            <div className={s.chips} role="group" aria-label="Days of the week">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.n}
                  type="button"
                  className={`${s.chip} ${weekdays.has(d.n) ? s.chipOn : ""}`}
                  aria-pressed={weekdays.has(d.n)}
                  onClick={() => toggleWeekday(d.n)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {okCount < 2 ? (
              <p className={s.muted}>Add at least two calendars to see times that work for the group.</p>
            ) : weekdays.size === 0 ? (
              <p className={s.muted}>Pick at least one day.</p>
            ) : windows.length === 0 ? (
              <p className={s.muted}>No {fmtDuration(minMinutes * 60_000)} window on these days. Try more days, a wider time of day, or a shorter length.</p>
            ) : (
              <ul className={s.times}>
                {windows.map((w) => (
                  <li key={w.start} className={`${s.time} ${w.missing.length ? s.timePartial : ""}`}>
                    <b>{fmtRange(w.start, w.end)}</b>
                    <span className={s.small}>
                      {fmtDuration(w.end - w.start)}
                      {w.missing.length ? ` · without ${listNames(w.missing.map(nameOf))}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={s.card}>
            <h2 className={s.h2}>Calendars</h2>
            {members && (
              <CalendarList
                groupId={id}
                members={members}
                errorOf={(mid) => {
                  const r = busy?.members[mid];
                  return r && "error" in r ? r.error : null;
                }}
                onChanged={() => load()}
              />
            )}
            <div className={s.row} style={{ marginTop: 12 }}>
              <button type="button" onClick={copyLink}>{copied ? "Link copied" : "Copy invite link"}</button>
            </div>
          </section>

          <AddCalendar groupId={id} onAdded={() => load()} />
        </div>
      </div>
    </main>
  );
}
