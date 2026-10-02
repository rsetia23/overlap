import { NextResponse } from "next/server";
import { bad, cleanName } from "@/lib/http";
import { addPerson, createGroup } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name, 60);
  if (!name) return bad("Give the group a name (up to 60 characters).");
  const you = cleanName(body.you, 40);
  if (!you) return bad("Enter your name (up to 40 characters).");
  const id = await createGroup(name);
  // The creator joins straight away.
  const me = await addPerson(id, you);
  return NextResponse.json({ id, me });
}
