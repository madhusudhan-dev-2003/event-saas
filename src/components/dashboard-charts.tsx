"use client";

type Slice = { label: string; value: number; color: string };

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${end.x} ${end.y} A ${r} ${r} 0 ${large} 1 ${start.x} ${start.y} Z`;
}

export function PieChart({
  title,
  slices,
}: {
  title: string;
  slices: Slice[];
}) {
  const total = slices.reduce((n, s) => n + s.value, 0) || 1;
  let angle = 0;
  const paths = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / total) * 360;
      const start = angle;
      const end = angle + sweep;
      angle = end;
      return { ...s, d: arcPath(60, 60, 52, start, end === start ? start + 0.01 : end) };
    });

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="chart-body">
        <svg viewBox="0 0 120 120" className="pie-svg" aria-hidden="true">
          {total === 1 && slices.every((s) => s.value === 0) ? (
            <circle cx="60" cy="60" r="52" fill="#efe8e2" />
          ) : paths.length === 1 && paths[0].value === total ? (
            <circle cx="60" cy="60" r="52" fill={paths[0].color} />
          ) : (
            paths.map((p) => <path key={p.label} d={p.d} fill={p.color} />)
          )}
          <circle cx="60" cy="60" r="28" fill="#fffefd" />
          <text
            x="60"
            y="64"
            textAnchor="middle"
            className="pie-center"
          >
            {slices.reduce((n, s) => n + s.value, 0)}
          </text>
        </svg>
        <ul className="chart-legend">
          {slices.map((s) => (
            <li key={s.label}>
              <span style={{ background: s.color }} />
              {s.label}
              <strong>{s.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BarChart({
  title,
  bars,
}: {
  title: string;
  bars: { label: string; value: number }[];
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="bar-chart">
        {bars.map((b) => (
          <div key={b.label} className="bar-row">
            <span className="bar-label">{b.label}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${(b.value / max) * 100}%` }}
              />
            </div>
            <span className="bar-value">{b.value}</span>
          </div>
        ))}
        {!bars.length && <p className="empty-inline">No data yet</p>}
      </div>
    </div>
  );
}
