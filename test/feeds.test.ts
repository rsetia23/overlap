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

it("passes other providers' iCal links through", () => {
  const outlook = "https://outlook.office365.com/owa/calendar/abc@contoso.com/def/calendar.ics";
  expect(normalizeFeedUrl(outlook)).toBe(outlook);
  expect(normalizeFeedUrl("webcal://p42-caldav.icloud.com/published/2/MTIz#x")).toBe(
    "https://p42-caldav.icloud.com/published/2/MTIz",
  );
});

it("rejects Google pages that aren't feeds and local or odd destinations", () => {
  expect(normalizeFeedUrl("http://calendar.google.com/calendar/ical/me%40gmail.com/public/basic.ics")).toBeNull();
  expect(normalizeFeedUrl("https://calendar.google.com/calendar/u/0?cid=bm90IGFuIGVtYWls")).toBeNull();
  expect(normalizeFeedUrl("https://localhost/cal.ics")).toBeNull();
  expect(normalizeFeedUrl("http://127.0.0.1/cal.ics")).toBeNull();
  expect(normalizeFeedUrl("http://169.254.169.254/latest/meta-data")).toBeNull();
  expect(normalizeFeedUrl("http://[::1]/cal.ics")).toBeNull();
  expect(normalizeFeedUrl("https://example.com:8443/cal.ics")).toBeNull();
  expect(normalizeFeedUrl("https://user:pw@example.com/cal.ics")).toBeNull();
  expect(normalizeFeedUrl("ftp://example.com/cal.ics")).toBeNull();
  expect(normalizeFeedUrl("not a url")).toBeNull();
});
