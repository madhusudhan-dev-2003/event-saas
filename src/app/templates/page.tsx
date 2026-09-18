import Link from "next/link";
import { Shell } from "@/components/shell";
import { occasions } from "@/lib/planning";
import { getShellContext } from "@/lib/space-context";

export default async function Templates({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  const query = await searchParams;
  const { user, spaces, spaceId } = await getShellContext(query.space);
  return (
    <Shell
      user={user}
      spaces={spaces}
      spaceId={spaceId}
      active="templates"
    >
      <p className="eyebrow">A THOUGHTFUL HEAD START</p>
      <h1>A plan for every kind of joy.</h1>
      <p>
        Ready-to-personalize checklists, service categories and optional
        modules. Nothing booked. Everything yours to shape.
      </p>
      <div className="template-grid">
        {occasions.map((o) => (
          <article key={o.key} className="template-card">
            <span className={`starter-icon ${o.color}`}>{o.glyph}</span>
            <h2>{o.name}</h2>
            <p>{o.description}</p>
            <ul>
              {o.tasks.slice(0, 3).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <Link
              className="secondary"
              href={`/new?template=${o.key}${spaceId ? `&space=${spaceId}` : ""}`}
            >
              Use this starter
            </Link>
          </article>
        ))}
      </div>
    </Shell>
  );
}
