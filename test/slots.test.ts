import { describe, expect, it } from "vitest";
import { mergeIntervals } from "../src/lib/intervals";
import { buildGrid, findWindows } from "../src/lib/slots";

// Runs with TZ=America/New_York (see the test script).
const at = (s: string) => new Date(s).getTime();
const hour = (t: number) => new Date(t).getHours();

describe("mergeIntervals", () => {
  it("merges overlapping and touching intervals and drops empty ones", () => {
    expect(
      mergeIntervals([
        { start: 5, end: 8 },
        { start: 1, end: 3 },
        { start: 3, end: 4 },
        { start: 7, end: 9 },
        { start: 10, end: 10 },
      ]),
    ).toEqual([
      { start: 1, end: 4 },
      { start: 5, end: 9 },
    ]);
  });
});

describe("buildGrid / findWindows", () => {
  const opts = { firstDay: new Date(2026, 9, 5), numDays: 2, startHour: 9, endHour: 13, slotMinutes: 30 };
  const busy = {
    a: [{ start: at("2026-10-05T10:00:00-04:00"), end: at("2026-10-05T11:00:00-04:00") }],
    b: [{ start: at("2026-10-05T12:00:00-04:00"), end: at("2026-10-05T12:30:00-04:00") }],
  };

  it("builds local-time slots and marks who is busy", () => {
    const days = buildGrid(opts, busy);
    expect(days).toHaveLength(2);
    expect(days[0].slots).toHaveLength(8);
    expect(hour(days[0].slots[0].start)).toBe(9);
    expect(days[0].slots[2].busy).toEqual(["a"]); // 10:00
    expect(days[0].slots[6].busy).toEqual(["b"]); // 12:00
    expect(days[1].slots.every((s) => s.free.length === 2)).toBe(true);
  });

  it("finds windows where everyone is free, split by busy slots and days", () => {
    const w = findWindows(buildGrid(opts, busy), 2, 60);
    expect(w.map((x) => [hour(x.start), hour(x.end), new Date(x.start).getDate()])).toEqual([
      [9, 10, 5],
      [11, 12, 5],
      [9, 13, 6],
    ]);
  });

  it("reports who is missing when fewer than everyone is required", () => {
    const w = findWindows(buildGrid(opts, busy), 1, 240);
    expect(w[0].missing.sort()).toEqual(["a", "b"]);
  });

  it("skips the nonexistent hour on a spring-forward day", () => {
    const days = buildGrid({ firstDay: new Date(2027, 2, 14), numDays: 1, startHour: 1, endHour: 4, slotMinutes: 60 }, {});
    expect(days[0].slots.map((s) => hour(s.start))).toEqual([1, 3]);
  });
});
