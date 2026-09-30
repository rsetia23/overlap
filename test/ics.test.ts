import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { busyIntervals } from "../src/lib/ics";

const ics = readFileSync(new URL("./fixtures/google.ics", import.meta.url), "utf8");
const iso = (list: { start: number; end: number }[]) =>
  list.map((i) => [new Date(i.start).toISOString(), new Date(i.end).toISOString()]);

describe("busyIntervals", () => {
  it("expands a weekly series in its own timezone", () => {
    const out = busyIntervals(ics, new Date("2026-09-28T12:00Z"), new Date("2026-09-28T23:00Z"));
    expect(iso(out)).toEqual([["2026-09-28T14:00:00.000Z", "2026-09-28T15:00:00.000Z"]]);
  });

  it("applies EXDATE, moved occurrences, transparency, declines and cancellations", () => {
    const out = busyIntervals(ics, new Date("2026-10-05T10:00Z"), new Date("2026-10-13T00:00Z"))
      // drop the daily 09:00Z gym block, covered by its own test
      .filter((i) => new Date(i.start).getUTCHours() !== 9);
    expect(iso(out)).toEqual([
      ["2026-10-08T18:00:00.000Z", "2026-10-08T19:00:00.000Z"], // dinner
      ["2026-10-12T18:00:00.000Z", "2026-10-12T19:00:00.000Z"], // standup moved to 2pm EDT
    ]);
  });

  it("reaches today for a daily series that started years ago", () => {
    const out = busyIntervals(ics, new Date("2026-10-10T00:00Z"), new Date("2026-10-11T00:00Z"));
    expect(iso(out)).toEqual([["2026-10-10T09:00:00.000Z", "2026-10-10T09:30:00.000Z"]]);
  });

  it("clips events to the requested range", () => {
    const out = busyIntervals(ics, new Date("2026-10-10T09:15Z"), new Date("2026-10-10T12:00Z"));
    expect(iso(out)).toEqual([["2026-10-10T09:15:00.000Z", "2026-10-10T09:30:00.000Z"]]);
  });
});
