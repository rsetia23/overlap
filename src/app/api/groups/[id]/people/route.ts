import { NextResponse } from "next/server";
import { bad, cleanName, loadGroup } from "@/lib/http";
import { addPerson, listPeople, renamePerson } from "@/lib/store";

const MAX_PEOPLE = 30;
const NAME_HINT = "Enter a name (up to 40 characters).";

/** Add a name to the group. Adding a name that's already there returns it. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, error } = await loadGroup(params);
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name, 40);
  if (!name) return bad(NAME_HINT);
  const people = await listPeople(id);
  const taken = people.some((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!taken && people.length >= MAX_PEOPLE) return bad(`Groups are limited to ${MAX_PEOPLE} people.`);
  return NextResponse.json({ person: await addPerson(id, name) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, error } = await loadGroup(params);
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const personId = typeof body.personId === "string" ? body.personId : "";
  const name = cleanName(body.name, 40);
  if (!name) return bad(NAME_HINT);
  if (!(await renamePerson(id, personId, name))) return bad("That person is no longer in this group.", 404);
  return NextResponse.json({ person: { id: personId, name } });
}
