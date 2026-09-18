import { redirect } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { getShellContext } from "@/lib/space-context";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  const query = await searchParams;
  const { user, spaceId } = await getShellContext(query.space);
  if (!user) {
    return (
      <Shell>
        <div className="page-intro">
          <div>
            <p className="eyebrow">ROOM FOR EVERY OCCASION</p>
            <h1>More celebrating. Less figuring it out.</h1>
            <p>
              A thoughtful home for your plans, your people, and all the little
              details.
            </p>
            <Link className="primary" href="/login">
              Sign in to start
            </Link>
          </div>
        </div>
      </Shell>
    );
  }
  if (!spaceId) redirect("/spaces/new");
  redirect(`/dashboard?space=${spaceId}`);
}
