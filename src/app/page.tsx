import { redirect } from "next/navigation";
import { getShellContext } from "@/lib/space-context";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  const query = await searchParams;
  const { user, spaceId } = await getShellContext(query.space);
  if (!user) redirect("/login");
  if (!spaceId) redirect("/spaces/new");
  redirect(`/dashboard?space=${spaceId}`);
}
