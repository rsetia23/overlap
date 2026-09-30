import { busyIntervals } from "./ics";
import type { Interval } from "./intervals";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_FEED_BYTES = 15 * 1024 * 1024;

// Busy times are always computed for this fixed window so one cached result
// serves every date range the page can ask for.
export const WINDOW_DAYS = 42;
export function busyWindow(now = Date.now()) {
  const from = new Date(now - 24 * 3600_000);
  return { from, to: new Date(from.getTime() + (WINDOW_DAYS + 1) * 24 * 3600_000) };
}

/**
 * Accepts only Google Calendar iCal addresses, so the server can't be pointed
 * at arbitrary URLs. `webcal://` links are rewritten to https.
 */
export function normalizeFeedUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim().replace(/^webcal:/i, "https:"));
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "calendar.google.com") return null;
  if (!/^\/calendar\/ical\/[^/]+\/[^/]+\/basic\.ics$/.test(url.pathname)) return null;
  return url.toString();
}

export class FeedError extends Error {}

export async function fetchBusy(url: string): Promise<Interval[]> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new FeedError("Google Calendar didn't respond in time.");
  }
  if (res.status === 404 || res.status === 403) {
    throw new FeedError("Google rejected this link. It may have been reset; paste a fresh secret address.");
  }
  if (!res.ok) throw new FeedError(`Google Calendar returned an error (${res.status}).`);
  const text = await res.text();
  if (text.length > MAX_FEED_BYTES) throw new FeedError("This calendar is too large to read.");
  if (!text.includes("BEGIN:VCALENDAR")) throw new FeedError("That link didn't return a calendar.");
  const { from, to } = busyWindow();
  try {
    return busyIntervals(text, from, to);
  } catch {
    throw new FeedError("Couldn't read this calendar's events.");
  }
}
