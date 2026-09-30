import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Secret iCal URLs grant read access to someone's whole calendar, so they are
// stored encrypted (AES-256-GCM) and only ever decrypted on the server.
function key(): Buffer {
  const k = process.env.FEED_KEY;
  if (!k) throw new Error("FEED_KEY is not set");
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) throw new Error("FEED_KEY must be 32 bytes, base64-encoded");
  return buf;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(blob: string): string {
  const [iv, tag, body] = blob.split(".").map((s) => Buffer.from(s, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}
