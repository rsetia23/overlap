import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import { decrypt, encrypt } from "./crypto";
import type { Interval } from "./intervals";

// The Vercel Marketplace Upstash integration injects KV_REST_API_*; a
// directly-created Upstash database uses UPSTASH_REDIS_REST_*.
const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

// Groups nobody touches for this long are dropped along with their feed URLs.
const GROUP_TTL_SECONDS = 60 * 60 * 24 * 120;
const BUSY_CACHE_SECONDS = 60 * 10;

export type GroupMeta = { name: string; createdAt: number };
export type StoredMember = { id: string; name: string; feedEnc: string; addedAt: number };
export type PublicMember = { id: string; name: string };

const metaKey = (g: string) => `group:${g}`;
const membersKey = (g: string) => `group:${g}:members`; // hash: memberId -> StoredMember
const busyKey = (g: string, m: string) => `busy:${g}:${m}`;

const newId = (bytes: number) => randomBytes(bytes).toString("base64url");

export const isValidId = (id: string) => /^[A-Za-z0-9_-]{6,20}$/.test(id);

async function touch(groupId: string) {
  await Promise.all([
    redis.expire(metaKey(groupId), GROUP_TTL_SECONDS),
    redis.expire(membersKey(groupId), GROUP_TTL_SECONDS),
  ]);
}

export async function createGroup(name: string): Promise<string> {
  const id = newId(8);
  await redis.set(metaKey(id), { name, createdAt: Date.now() } satisfies GroupMeta, {
    ex: GROUP_TTL_SECONDS,
  });
  return id;
}

export async function getGroup(groupId: string): Promise<GroupMeta | null> {
  return redis.get<GroupMeta>(metaKey(groupId));
}

async function storedMembers(groupId: string): Promise<StoredMember[]> {
  const all = await redis.hgetall<Record<string, StoredMember>>(membersKey(groupId));
  return Object.values(all ?? {}).sort((a, b) => a.addedAt - b.addedAt);
}

export async function listMembers(groupId: string): Promise<PublicMember[]> {
  return (await storedMembers(groupId)).map(({ id, name }) => ({ id, name }));
}

/** Members with decrypted feed URLs. Server-only; never send these to a client. */
export async function membersWithFeeds(groupId: string) {
  return (await storedMembers(groupId)).map((m) => ({ id: m.id, name: m.name, url: decrypt(m.feedEnc) }));
}

export async function addMember(groupId: string, name: string, url: string): Promise<PublicMember> {
  const member: StoredMember = { id: newId(6), name, feedEnc: encrypt(url), addedAt: Date.now() };
  await redis.hset(membersKey(groupId), { [member.id]: member });
  await touch(groupId);
  return { id: member.id, name };
}

export async function removeMember(groupId: string, memberId: string) {
  await Promise.all([redis.hdel(membersKey(groupId), memberId), redis.del(busyKey(groupId, memberId))]);
}

export async function getCachedBusy(groupId: string, memberId: string) {
  return redis.get<Interval[]>(busyKey(groupId, memberId));
}

export async function setCachedBusy(groupId: string, memberId: string, busy: Interval[]) {
  await redis.set(busyKey(groupId, memberId), busy, { ex: BUSY_CACHE_SECONDS });
}
