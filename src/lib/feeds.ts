import { busyIntervals } from "./ics";
import type { Interval } from "./intervals";
import { isFetchableUrl, safeFetch, UnsafeUrlError } from "./safe-fetch";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_FEED_BYTES = 15 * 1024 * 1024;

// Busy times are always computed for this fixed window so one cached result
// serves every date range the page can ask for.
export const WINDOW_DAYS = 42;
export function busyWindow(now = Date.now()) {
  const from = new Date(now - 24 * 3600_000);
  return { from, to: new Date(from.getTime() + (WINDOW_DAYS + 1) * 24 * 3600_000) };
}

const CAL_ID = /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i;

/** Google's "Get shareable link" (?cid=, base64 of the calendar id) or embed (?src=) links. */
function calendarIdFromShareLink(url: URL): string | null {
  const src = url.searchParams.get("src");
  if (src && CAL_ID.test(src)) return src;
  const cid = url.searchParams.get("cid");
  if (!cid) return null;
  if (CAL_ID.test(cid)) return cid;
  const decoded = Buffer.from(cid.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  return CAL_ID.test(decoded) ? decoded : null;
}

const isGoogle = (url: string) => new URL(url).hostname === "calendar.google.com";

/**
 * Takes any iCal address (`webcal://` is rewritten to https) on a public web
 * host. Google share links become the calendar's public iCal address; other
 * Google pages aren't feeds, so they're rejected up front with a better hint.
 * Hosts are checked again at fetch time, after DNS (see safe-fetch).
 */
export function normalizeFeedUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim().replace(/^webcal:/i, "https:"));
  } catch {
    return null;
  }
  if (!isFetchableUrl(url)) return null;
  url.hash = "";
  if (url.hostname !== "calendar.google.com") return url.href;
  if (url.protocol !== "https:") return null;
  if (/^\/calendar\/ical\/[^/]+\/[^/]+\/basic\.ics$/.test(url.pathname)) return url.origin + url.pathname;
  const calId = calendarIdFromShareLink(url);
  return calId ? `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics` : null;
}

export class FeedError extends Error {}

export async function fetchBusy(url: string): Promise<Interval[]> {
  const google = isGoogle(url);
  const source = google ? "Google Calendar" : "The calendar server";
  let res: Response;
  try {
    res = await safeFetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
  } catch (e) {
    if (e instanceof UnsafeUrlError) throw new FeedError("That link doesn't point to a public calendar server.");
    throw new FeedError(`${source} didn't respond in time.`);
  }
  if (res.status === 404 || res.status === 403 || res.status === 401) {
    throw new FeedError(
      google
        ? "Google won't share this calendar. Make sure it's shared publicly as free/busy, or paste a fresh secret address if you reset it."
        : "The calendar server won't share this calendar. Make sure it's published, or paste a fresh link if you reset it.",
    );
  }
  if (!res.ok) throw new FeedError(`${source} returned an error (${res.status}).`);
  const text = await res.text();
  if (text.length > MAX_FEED_BYTES) throw new FeedError("This calendar is too large to read.");
  if (!text.includes("BEGIN:VCALENDAR")) throw new FeedError("That link didn't return a calendar. Look for an iCal or .ics link in your calendar's sharing settings.");
  const { from, to } = busyWindow();
  try {
    return busyIntervals(text, from, to);
  } catch {
    throw new FeedError("Couldn't read this calendar's events.");
  }
}

/** A label for a calendar added without one, from where its feed lives. */
export function defaultCalendarName(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "calendar.google.com") return "Google Calendar";
  if (/(^|\.)(outlook|office365|office|live)\.com$/.test(host)) return "Outlook";
  if (/(^|\.)icloud\.com$/.test(host)) return "iCloud";
  return host.slice(0, 40);
}
