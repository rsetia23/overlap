import { NextResponse } from "next/server";
import { bad, cleanName } from "@/lib/http";
import { createGroup } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name, 60);
  if (!name) return bad("Give the group a name (up to 60 characters).");
  return NextResponse.json({ id: await createGroup(name) });
}
