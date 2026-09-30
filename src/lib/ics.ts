import IcalExpander from "ical-expander";
import { mergeIntervals, type Interval } from "./intervals";

// Google only emits events up to a few years out; the cap exists so a
// pathological rule can't spin forever. It counts from the series' first
// occurrence, so it must be large enough to reach today for old daily events.
const MAX_ITERATIONS = 50_000;

// ical.js 1.x ships no typings; this is the slice of its API used here.
type IcalProperty = { getFirstValue(): unknown; getParameter(name: string): unknown };
type IcalComponent = {
  getFirstPropertyValue(name: string): unknown;
  getAllProperties(name: string): IcalProperty[];
};
type IcalTime = { toJSDate(): Date };
type IcalEvent = {
  uid: string;
  component: IcalComponent;
  startDate: IcalTime;
  endDate: IcalTime;
  isRecurrenceException(): boolean;
};
type Occurrence = { item: IcalEvent; startDate: IcalTime; endDate: IcalTime };
type Expander = {
  component: IcalComponent;
  events: IcalEvent[];
  between(after: Date, before: Date): { events: IcalEvent[]; occurrences: Occurrence[] };
};

function countsAsBusy(event: IcalEvent, ownerEmail: string | null): boolean {
  const c = event.component;
  if (String(c.getFirstPropertyValue("transp") ?? "").toUpperCase() === "TRANSPARENT") return false;
  if (String(c.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED") return false;
  if (ownerEmail) {
    for (const att of c.getAllProperties("attendee")) {
      const email = String(att.getFirstValue()).replace(/^mailto:/i, "").toLowerCase();
      if (email !== ownerEmail) continue;
      if (String(att.getParameter("partstat") ?? "").toUpperCase() === "DECLINED") return false;
    }
  }
  return true;
}

/** Busy intervals (merged, clipped to [from, to]) from an iCalendar feed. */
export function busyIntervals(ics: string, from: Date, to: Date): Interval[] {
  const expander = new IcalExpander({
    ics,
    maxIterations: MAX_ITERATIONS,
    skipInvalidDates: true,
  }) as unknown as Expander;

  // For a Google primary calendar, X-WR-CALNAME is the owner's email address,
  // which lets us drop invites they declined.
  const calName = expander.component.getFirstPropertyValue("x-wr-calname");
  const ownerEmail = typeof calName === "string" && calName.includes("@") ? calName.toLowerCase() : null;

  const { events, occurrences } = expander.between(from, to);
  const raw: Interval[] = [];
  const add = (event: IcalEvent, start: IcalTime, end: IcalTime) => {
    if (!countsAsBusy(event, ownerEmail)) return;
    raw.push({
      start: Math.max(start.toJSDate().getTime(), from.getTime()),
      end: Math.min(end.toJSDate().getTime(), to.getTime()),
    });
  };
  for (const e of events) add(e, e.startDate, e.endDate);
  // Google's free/busy-only public feed has no series: each repeat is its own
  // VEVENT with a RECURRENCE-ID but no parent RRULE. ical-expander only uses
  // an exception when its parent is present, so treat orphans as plain events.
  const parents = new Set(expander.events.filter((e) => !e.isRecurrenceException()).map((e) => e.uid));
  for (const e of expander.events) {
    if (!e.isRecurrenceException() || parents.has(e.uid)) continue;
    const start = e.startDate.toJSDate().getTime();
    const end = e.endDate.toJSDate().getTime();
    if (end > from.getTime() && start < to.getTime()) add(e, e.startDate, e.endDate);
  }
  for (const o of occurrences) add(o.item, o.startDate, o.endDate);
  return mergeIntervals(raw);
}
