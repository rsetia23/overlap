import { NextResponse } from "next/server";
import { defaultCalendarName, FeedError, fetchBusy, normalizeFeedUrl } from "@/lib/feeds";
import { bad, cleanName, loadGroup } from "@/lib/http";
import { addMember, hasPerson, isValidId, listMembers, removeMember, renameMember, setCachedBusy } from "@/lib/store";

const MAX_CALENDARS = 60;
const MAX_PER_PERSON = 10;

/** Add a calendar under someone's name. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, error } = await loadGroup(params);
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
  if (!(await hasPerson(id, ownerId))) return bad("Choose whose calendar this is.");
  const url = typeof body.url === "string" ? normalizeFeedUrl(body.url) : null;
  if (!url) {
    return bad(
      "That doesn't look like a calendar link. Paste an iCal (.ics or webcal://) address from your calendar's sharing settings, or a Google Calendar shareable link.",
    );
  }
  const label = typeof body.name === "string" && body.name.trim() ? cleanName(body.name, 40) : defaultCalendarName(url);
  if (!label) return bad("Calendar names can be up to 40 characters.");
  const all = await listMembers(id);
  if (all.length >= MAX_CALENDARS) return bad(`Groups are limited to ${MAX_CALENDARS} calendars.`);
  if (all.filter((m) => m.ownerId === ownerId).length >= MAX_PER_PERSON) {
    return bad(`Each person can have up to ${MAX_PER_PERSON} calendars.`);
  }

  // Read the feed once before saving so a bad link is caught while the person
  // is still on the form.
  let busy;
  try {
    busy = await fetchBusy(url);
  } catch (e) {
    return bad(e instanceof FeedError ? e.message : "Couldn't read that calendar.");
  }
  const member = await addMember(id, ownerId, label, url);
  await setCachedBusy(id, member.id, busy);
  return NextResponse.json({ member });
}

// Who may remove or rename a calendar is left to the honor system: the page
// only offers it on your own, but the server doesn't check.

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, error } = await loadGroup(params);
  if (error) return error;
  const memberId = new URL(req.url).searchParams.get("memberId") ?? "";
  if (!isValidId(memberId)) return bad("Unknown calendar");
  await removeMember(id, memberId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, error } = await loadGroup(params);
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!isValidId(memberId)) return bad("Unknown calendar");
  const name = cleanName(body.name, 40);
  if (!name) return bad("Give this calendar a name (up to 40 characters).");
  if (!(await renameMember(id, memberId, name))) return bad("That calendar is no longer in this group.", 404);
  return NextResponse.json({ member: { id: memberId, name } });
}
