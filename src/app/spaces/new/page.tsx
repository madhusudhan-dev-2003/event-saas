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
    <Shell user={user} spaces={spaces} spaceId={spaceId} active="settings">
      <p className="eyebrow">KEEP YOUR WORLDS CONNECTED, YOUR PLANS PRIVATE</p>
      <h1>A new space for your people.</h1>
      <div className="panel narrow">
        <SpaceForm />
      </div>
    </Shell>
  );
}
