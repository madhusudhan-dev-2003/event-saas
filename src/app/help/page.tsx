import { Shell } from "@/components/shell";
import { PlanningGuide } from "@/components/planning-guide";
import { getShellContext } from "@/lib/space-context";

export default async function Help({
  searchParams,
}: {
  searchParams: Promise<{ space?: string; q?: string }>;
}) {
  const query = await searchParams;
  const { user, spaces, spaceId } = await getShellContext(query.space);
  return (
    <Shell
      user={user}
      spaces={spaces}
      spaceId={spaceId}
      active="help"
      title="Planning guide"
      description="How Utsava is meant to be used — private spaces, real records, and links you share on purpose."
    >
      <PlanningGuide spaceId={spaceId} query={query.q || ""} />
    </Shell>
  );
}
