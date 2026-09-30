import { expect, it } from "vitest";
import { normalizeFeedUrl } from "../src/lib/feeds";

const pub = "https://calendar.google.com/calendar/ical/me%40gmail.com/public/basic.ics";

it("turns share and embed links into the public iCal address", () => {
  expect(normalizeFeedUrl("https://calendar.google.com/calendar/u/0?cid=bWVAZ21haWwuY29t")).toBe(pub);
  expect(normalizeFeedUrl("https://calendar.google.com/calendar/embed?src=me%40gmail.com&ctz=America%2FNew_York")).toBe(pub);
});

it("accepts iCal addresses, secret or public, and webcal links", () => {
  const secret = "https://calendar.google.com/calendar/ical/me%40gmail.com/private-abc123/basic.ics";
  expect(normalizeFeedUrl(` ${secret} `)).toBe(secret);
  expect(normalizeFeedUrl(pub.replace("https:", "webcal:"))).toBe(pub);
});

it("rejects anything that isn't Google Calendar", () => {
  expect(normalizeFeedUrl("https://evil.example.com/calendar/ical/a/b/basic.ics")).toBeNull();
  expect(normalizeFeedUrl("http://calendar.google.com/calendar/ical/me%40gmail.com/public/basic.ics")).toBeNull();
  expect(normalizeFeedUrl("https://calendar.google.com/calendar/u/0?cid=bm90IGFuIGVtYWls")).toBeNull();
  expect(normalizeFeedUrl("not a url")).toBeNull();
});
