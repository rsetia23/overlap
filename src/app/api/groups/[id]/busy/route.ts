import { NextResponse } from "next/server";
import { busyWindow, FeedError, fetchBusy } from "@/lib/feeds";
import { loadGroup } from "@/lib/http";
import type { Interval } from "@/lib/intervals";
import { getCachedBusy, membersWithFeeds, setCachedBusy } from "@/lib/store";

export type BusyResponse = {
  from: number;
  to: number;
  members: Record<string, { busy: Interval[] } | { error: string }>;
};

// Only busy start/end times leave this route: no titles, no feed URLs.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id, error } = await loadGroup(params);
  if (error) return error;
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const members = await membersWithFeeds(id);

  const entries = await Promise.all(
    members.map(async (m) => {
      if (!refresh) {
        const cached = await getCachedBusy(id, m.id);
        if (cached) return [m.id, { busy: cached }] as const;
      }
      try {
        const busy = await fetchBusy(m.url);
        await setCachedBusy(id, m.id, busy);
        return [m.id, { busy }] as const;
      } catch (e) {
        return [m.id, { error: e instanceof FeedError ? e.message : "Couldn't read this calendar." }] as const;
      }
    }),
  );

  const { from, to } = busyWindow();
  const payload: BusyResponse = { from: from.getTime(), to: to.getTime(), members: Object.fromEntries(entries) };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
