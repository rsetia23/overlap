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

/** One green scale: gray when nobody is free, deeper green as more people are. */
function colorFor(free: number, total: number) {
  if (!total || free === 0) return "var(--none)";
  if (free === total) return "var(--all-free)";
  const pct = Math.round(20 + (free / total) * 45);
  return `color-mix(in srgb, var(--all-free) ${pct}%, var(--none))`;
}

/** Every count for small groups; nobody / a middle step / everyone for big ones. */
function legendSteps(total: number) {
  if (total <= 5) return Array.from({ length: total + 1 }, (_, i) => i);
  return [0, Math.round(total / 2), total];
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
                    style={{ background: colorFor(slot.free.length, total) }}
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
        {legendSteps(total).map((n) => (
          <span key={n} className={s.legendItem}>
            <span className={s.swatch} style={{ background: colorFor(n, total) }} />
            {n === total ? "everyone" : n === 0 ? "nobody" : `${n} of ${total}`}
          </span>
        ))}
        <span className={s.legendItem}>
          <span className={`${s.swatch} ${s.pastSwatch}`} /> past
        </span>
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
