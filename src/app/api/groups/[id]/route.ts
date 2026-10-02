import { NextResponse } from "next/server";
import { loadGroup } from "@/lib/http";
import { listMembers, listPeople } from "@/lib/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, group, error } = await loadGroup(params);
  if (error) return error;
  const [people, members] = await Promise.all([listPeople(id), listMembers(id)]);
  return NextResponse.json({ name: group.name, people, members }, { headers: { "Cache-Control": "no-store" } });
}
