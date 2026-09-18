import { db } from "@/lib/db";
import { can, parsePermissions } from "@/lib/permissions";
import { EventForm, SpaceForm } from "@/components/forms";
import { Shell } from "@/components/shell";
import { getShellContext } from "@/lib/space-context";
import { redirect } from "next/navigation";

export default async function New({
  searchParams,
}: {
  searchParams: Promise<{ space?: string; template?: string }>;
}) {
  const q = await searchParams;
  const { user, spaces: allSpaces, spaceId } = await getShellContext(q.space);
  if (!user) redirect("/login");
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: { space: true, role: true },
  });
  const spaces = memberships
    .filter((m) => can(parsePermissions(m.role.permissions), "events.write"))
    .map((m) => m.space);
  return (
    <Shell
      user={user}
      spaces={allSpaces}
      spaceId={spaceId}
      active="celebrations"
    >
      <p className="eyebrow">SOMETHING TO LOOK FORWARD TO</p>
      <h1>Create a new event</h1>
      <p>Events stay inside the space you choose.</p>
      {spaces.length ? (
        <EventForm
          spaces={spaces}
          initialSpace={q.space || spaceId}
          initialTemplate={q.template}
        />
      ) : (
        <div className="panel">
          <h2>First, create a space for your plans</h2>
          <SpaceForm />
        </div>
      )}
    </Shell>
  );
}
