import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGroup, isValidId } from "@/lib/store";
import GroupView from "./GroupView";

async function load(id: string) {
  return isValidId(id) ? getGroup(id) : null;
}

export async function generateMetadata(props: PageProps<"/g/[id]">): Promise<Metadata> {
  const group = await load((await props.params).id);
  return { title: group ? `${group.name} · Overlap` : "Overlap" };
}

export default async function GroupPage(props: PageProps<"/g/[id]">) {
  const { id } = await props.params;
  const group = await load(id);
  if (!group) notFound();
  return <GroupView id={id} name={group.name} />;
}
