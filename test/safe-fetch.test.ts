import { afterEach, expect, it, vi } from "vitest";
import { isPublicAddress, safeFetch, UnsafeUrlError } from "../src/lib/safe-fetch";

afterEach(() => vi.unstubAllGlobals());

it("tells public addresses from private ones", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700::1111"]) expect(isPublicAddress(ip)).toBe(true);
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "nope"]) {
    expect(isPublicAddress(ip)).toBe(false);
  }
});

it("refuses hosts that resolve to private addresses before fetching", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(safeFetch("https://localhost/cal.ics")).rejects.toBeInstanceOf(UnsafeUrlError);
  await expect(safeFetch("http://127.0.0.1/cal.ics")).rejects.toBeInstanceOf(UnsafeUrlError);
  expect(fetch).not.toHaveBeenCalled();
});

it("re-checks redirect targets", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }));
  vi.stubGlobal("fetch", fetch);
  await expect(safeFetch("https://8.8.8.8/cal.ics")).rejects.toBeInstanceOf(UnsafeUrlError);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("follows public redirects", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "https://1.1.1.1/b.ics" } }))
    .mockResolvedValueOnce(new Response("BEGIN:VCALENDAR"));
  vi.stubGlobal("fetch", fetch);
  const res = await safeFetch("https://8.8.8.8/a.ics");
  expect(await res.text()).toBe("BEGIN:VCALENDAR");
  expect(String(fetch.mock.calls[1][0])).toBe("https://1.1.1.1/b.ics");
});
