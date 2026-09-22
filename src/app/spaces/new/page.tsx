import { requireUser } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { SpaceForm } from "@/components/forms";
import { getShellContext } from "@/lib/space-context";

export default async function NewSpace({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  const query = await searchParams;
  const user = await requireUser();
  const { spaces, spaceId } = await getShellContext(query.space);
  return (
    <Shell
      user={user}
      spaces={spaces}
      spaceId={spaceId}
      active="settings"
      title="A new space for your people"
      description="Keep your worlds connected and your plans private."
    >
      <div className="panel narrow">
        <SpaceForm />
      </div>
    </Shell>
  );
}
