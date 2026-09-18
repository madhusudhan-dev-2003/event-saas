import { Shell } from "@/components/shell";
import { PlanningGuide } from "@/components/planning-guide";
import { getShellContext } from "@/lib/space-context";

export default async function Help({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  const query = await searchParams;
  const { user, spaces, spaceId } = await getShellContext(query.space);
  return (
    <Shell user={user} spaces={spaces} spaceId={spaceId} active="help">
      <PlanningGuide spaceId={spaceId} />
    </Shell>
  );
}
