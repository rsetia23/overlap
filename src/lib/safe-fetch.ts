import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

// Calendar links come from users, so the server must never be steered at its
// own network: loopback, private ranges, link-local (cloud metadata), etc.
const blocked = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const) {
  blocked.addSubnet(net, bits, "ipv4");
}
for (const [net, bits] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, bits, "ipv6");
}

export function isPublicAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) address = mapped[1];
  const family = isIP(address);
  if (!family) return false;
  return !blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}

export class UnsafeUrlError extends Error {}

const MAX_REDIRECTS = 3;

/** Shape checks that need no network: web ports only, no credentials. */
export function isFetchableUrl(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.port && url.port !== "443" && url.port !== "80") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicAddress(host);
  return host.includes(".") && !/\.(localhost|local|internal)$/i.test(host);
}

async function assertPublic(url: URL) {
  if (!isFetchableUrl(url)) throw new UnsafeUrlError("blocked url");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return;
  const addresses = await lookup(host, { all: true }).catch(() => {
    throw new UnsafeUrlError("unresolvable host");
  });
  if (!addresses.length || !addresses.every((a) => isPublicAddress(a.address))) {
    throw new UnsafeUrlError("blocked address");
  }
}

/**
 * fetch() that refuses non-public destinations, re-checking each redirect hop.
 * A DNS answer that changes between the check and the request could still slip
 * through; closing that needs a pinned-IP agent and isn't worth it here.
 */
export async function safeFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let url = new URL(input);
  for (let hop = 0; ; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { ...init, redirect: "manual" });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) return res;
    if (hop >= MAX_REDIRECTS) throw new UnsafeUrlError("too many redirects");
    url = new URL(location, url);
  }
}
