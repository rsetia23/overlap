import { NextResponse } from "next/server";
import { getGroup, isValidId } from "./store";

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export function cleanName(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim();
  return s && s.length <= max ? s : null;
}

/** Resolves the group from route params, or a 404 response. */
export async function loadGroup(params: Promise<{ id: string }>) {
  const { id } = await params;
  const group = isValidId(id) ? await getGroup(id) : null;
  return group ? { id, group, error: null } : { id, group: null, error: bad("Group not found", 404) };
}
