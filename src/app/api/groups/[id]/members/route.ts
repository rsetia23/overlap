import { NextResponse } from "next/server";
import { FeedError, fetchBusy, normalizeFeedUrl } from "@/lib/feeds";
import { bad, cleanName, loadGroup } from "@/lib/http";
import { addMember, isValidId, listMembers, removeMember, setCachedBusy } from "@/lib/store";

const MAX_MEMBERS = 30;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, error } = await loadGroup(params);
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name, 40);
  if (!name) return bad("Enter your name (up to 40 characters).");
  const url = typeof body.url === "string" ? normalizeFeedUrl(body.url) : null;
  if (!url) {
    return bad(
      "That doesn't look like a Google Calendar link. Paste the link from “Get shareable link” or an iCal address from your calendar's settings.",
    );
  }
  if ((await listMembers(id)).length >= MAX_MEMBERS) return bad(`Groups are limited to ${MAX_MEMBERS} people.`);

  // Read the feed once before saving so a bad link is caught while the person
  // is still on the form.
  let busy;
  try {
    busy = await fetchBusy(url);
  } catch (e) {
    return bad(e instanceof FeedError ? e.message : "Couldn't read that calendar.");
  }
  const member = await addMember(id, name, url);
  await setCachedBusy(id, member.id, busy);
  return NextResponse.json({ member });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, error } = await loadGroup(params);
  if (error) return error;
  const memberId = new URL(req.url).searchParams.get("memberId") ?? "";
  if (!isValidId(memberId)) return bad("Unknown member");
  await removeMember(id, memberId);
  return NextResponse.json({ ok: true });
}
