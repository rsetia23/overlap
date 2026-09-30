import type { Interval } from "./intervals";

// Everything here runs in the viewer's browser and uses the browser's local
// timezone: `new Date(y, m, d, h, min)` resolves wall-clock times, including
// across DST changes, so a "9am" slot is 9am local on every day.

export type Slot = { start: number; end: number; free: string[]; busy: string[] };
export type Day = { date: Date; slots: Slot[] };
export type Window = { start: number; end: number; missing: string[] };

export type GridOptions = {
  firstDay: Date; // any time on the first day; only the local date is used
  numDays: number;
  startHour: number; // inclusive, 0-23
  endHour: number; // exclusive, 1-24
  slotMinutes: number;
};

function overlaps(list: Interval[], start: number, end: number): boolean {
  // Lists are merged and sorted, and small (one person, one week), so a
  // linear scan is plenty.
  for (const i of list) {
    if (i.start >= end) return false;
    if (i.end > start) return true;
  }
  return false;
}

export function buildGrid(opts: GridOptions, busy: Record<string, Interval[]>): Day[] {
  const ids = Object.keys(busy);
  const y = opts.firstDay.getFullYear();
  const m = opts.firstDay.getMonth();
  const d0 = opts.firstDay.getDate();
  const days: Day[] = [];
  for (let d = 0; d < opts.numDays; d++) {
    const slots: Slot[] = [];
    for (let min = opts.startHour * 60; min < opts.endHour * 60; min += opts.slotMinutes) {
      const start = new Date(y, m, d0 + d, 0, min).getTime();
      const end = new Date(y, m, d0 + d, 0, min + opts.slotMinutes).getTime();
      // On a spring-forward day a wall-clock slot can collapse; skip it.
      if (end <= start) continue;
      const free: string[] = [];
      const taken: string[] = [];
      for (const id of ids) (overlaps(busy[id], start, end) ? taken : free).push(id);
      slots.push({ start, end, free, busy: taken });
    }
    days.push({ date: new Date(y, m, d0 + d), slots });
  }
  return days;
}

/**
 * Runs of consecutive slots where at least `required` people are free, lasting
 * at least `minMinutes`. Runs never span days (the daily hours window breaks
 * them). `missing` is everyone busy at any point in the run.
 */
export function findWindows(days: Day[], required: number, minMinutes: number): Window[] {
  const out: Window[] = [];
  for (const day of days) {
    let run: Slot[] = [];
    const flush = () => {
      if (run.length && run[run.length - 1].end - run[0].start >= minMinutes * 60_000) {
        const missing = new Set(run.flatMap((s) => s.busy));
        out.push({ start: run[0].start, end: run[run.length - 1].end, missing: [...missing] });
      }
      run = [];
    };
    for (const slot of day.slots) {
      const contiguous = !run.length || run[run.length - 1].end === slot.start;
      if (slot.free.length >= required && contiguous) run.push(slot);
      else {
        flush();
        if (slot.free.length >= required) run.push(slot);
      }
    }
    flush();
  }
  return out;
}
