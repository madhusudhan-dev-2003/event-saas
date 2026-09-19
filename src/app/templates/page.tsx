import Link from "next/link";
import { Shell } from "@/components/shell";
import { occasions } from "@/lib/planning";
import { getShellContext } from "@/lib/space-context";

export default async function Templates({
  searchParams,
}: {
  searchParams: Promise<{ space?: string; q?: string }>;
}) {
  const query = await searchParams;
  const { user, spaces, spaceId } = await getShellContext(query.space);
  const search = (query.q || "").trim().toLowerCase();
  const starters = occasions.filter(
    (item) =>
      !search ||
      item.name.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.tasks.some((task) => task.toLowerCase().includes(search)),
  );
  return (
    <Shell
      user={user}
      spaces={spaces}
      spaceId={spaceId}
      active="templates"
      title="Occasion starters"
      description="Ready-to-personalize checklists. Nothing booked — yours to shape."
    >
      <div className="users-hub">
      <div className="celeb-kpi-grid users-kpi-grid">
        <div className="celeb-kpi">
          <b>Starters</b>
          <strong>{occasions.length}</strong>
        </div>
        <div className="celeb-kpi">
          <b>Occasions</b>
          <strong>{occasions.filter((item) => item.key !== "blank").length}</strong>
        </div>
        <div className="celeb-kpi">
          <b>Showing</b>
          <strong>{starters.length}</strong>
        </div>
        <div className="celeb-kpi">
          <b>Blank plans</b>
          <strong>1</strong>
        </div>
      </div>
      <div className="template-grid">
        {starters.map((o) => (
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
      {!starters.length ? (
        <p className="empty-inline">No occasion starters match this search.</p>
      ) : null}
      </div>
    </Shell>
  );
}
