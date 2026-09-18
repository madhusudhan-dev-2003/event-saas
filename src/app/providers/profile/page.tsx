import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  await requireUser();
  const query = await searchParams;
  const params = new URLSearchParams({ manage: "1" });
  if (query.space) params.set("space", query.space);
  redirect(`/providers?${params.toString()}`);
}
