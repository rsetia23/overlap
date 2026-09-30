"use client";

import { useState } from "react";
import type { Day, Slot } from "@/lib/slots";
import s from "../../ui.module.css";
import { fmtHour, fmtRange, listNames } from "./format";

type Props = {
  days: Day[];
  total: number;
  now: number;
  nameOf: (id: string) => string;
};

const minuteOfDay = (t: number) => {
  const d = new Date(t);
  return d.getHours() * 60 + d.getMinutes();
};

function cellColor(slot: Slot, total: number) {
  if (!total || !slot.free.length) return "var(--empty)";
  if (slot.free.length === total) return "var(--all-free)";
  const pct = Math.round(15 + (slot.free.length / total) * 55);
  return `color-mix(in srgb, var(--accent) ${pct}%, var(--empty))`;
}

export default function Heatmap({ days, total, now, nameOf }: Props) {
  const [hover, setHover] = useState<Slot | null>(null);
  const [pinned, setPinned] = useState<Slot | null>(null);
  const shown = hover ?? pinned;

  // Rows are wall-clock times. Keying cells by local minute of day keeps rows
  // aligned on DST days, where a day can have one slot fewer.
  const rowMinutes = [...new Set(days.flatMap((d) => d.slots.map((sl) => minuteOfDay(sl.start))))].sort((a, b) => a - b);
  const byDay = days.map((d) => new Map(d.slots.map((sl) => [minuteOfDay(sl.start), sl])));

  return (
    <div>
      <div className={s.gridWrap}>
        <div
          className={s.grid}
          style={{ gridTemplateColumns: `auto repeat(${days.length}, minmax(30px, 1fr))` }}
          onMouseLeave={() => setHover(null)}
        >
          <div />
          {days.map((d) => (
            <div key={d.date.getTime()} className={s.dayHead}>
              {d.date.toLocaleDateString(undefined, { weekday: "short" })}
              <b>{d.date.getDate()}</b>
            </div>
          ))}
          {rowMinutes.map((min) => {
            const onHour = min % 60 === 0;
            return [
              <div key={`t${min}`} className={s.timeLabel}>
                {onHour ? fmtHour(min / 60) : ""}
              </div>,
              ...byDay.map((cells, i) => {
                const slot = cells.get(min);
                if (!slot) return <div key={`${i}-${min}`} />;
                const classes = [s.cell, onHour && s.hourStart, slot.end <= now && s.past, shown === slot && s.selected];
                return (
                  <button
                    key={`${i}-${min}`}
                    type="button"
                    className={classes.filter(Boolean).join(" ")}
                    style={{ background: cellColor(slot, total) }}
                    aria-label={`${fmtRange(slot.start, slot.end)}: ${slot.free.length} of ${total} free`}
                    onMouseEnter={() => setHover(slot)}
                    onFocus={() => setHover(slot)}
                    onClick={() => setPinned(pinned === slot ? null : slot)}
                  />
                );
              }),
            ];
          })}
        </div>
      </div>

      <div className={s.legend}>
        <span className={s.swatch} style={{ background: "var(--empty)" }} /> nobody
        <span className={s.swatch} style={{ background: "color-mix(in srgb, var(--accent) 40%, var(--empty))" }} /> some
        <span className={s.swatch} style={{ background: "var(--all-free)" }} /> everyone free
      </div>

      <div className={s.detail} aria-live="polite">
        {shown ? (
          <>
            <b>{fmtRange(shown.start, shown.end)}</b>
            <div className={s.muted}>
              {shown.busy.length === 0
                ? "Everyone's free"
                : shown.free.length === 0
                  ? "Everyone's busy"
                  : `Busy: ${listNames(shown.busy.map(nameOf))} · Free: ${listNames(shown.free.map(nameOf))}`}
            </div>
          </>
        ) : (
          <span className={s.muted}>Hover over or tap a time to see who&apos;s busy.</span>
        )}
      </div>
    </div>
  );
}
