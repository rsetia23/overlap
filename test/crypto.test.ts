import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";

process.env.FEED_KEY = randomBytes(32).toString("base64");
const { encrypt, decrypt } = await import("../src/lib/crypto");

it("round-trips and doesn't leak the plaintext", () => {
  const url = "https://calendar.google.com/calendar/ical/me%40gmail.com/private-abc/basic.ics";
  const blob = encrypt(url);
  expect(blob).not.toContain("gmail");
  expect(decrypt(blob)).toBe(url);
  expect(encrypt(url)).not.toBe(blob); // fresh IV each time
});
