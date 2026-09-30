import { NextResponse } from "next/server";
import { loadGroup } from "@/lib/http";
import { listMembers } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, group, error } = await loadGroup(params);
  if (error) return error;
  return NextResponse.json({ name: group.name, members: await listMembers(id) });
}
