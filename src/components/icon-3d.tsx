const art = {
  celebrations: "icon3d-celebrations",
  progress: "icon3d-progress",
  tasks: "icon3d-tasks",
  guests: "icon3d-guests",
  rsvp: "icon3d-rsvp",
  budget: "icon3d-budget",
  gift: "icon3d-gift",
  cake: "icon3d-celebration-cake",
  people: "icon3d-people",
  providers: "icon3d-providers",
  settings: "icon3d-settings",
  plan: "icon3d-plan",
} as const;

export type Icon3dName = keyof typeof art;

export function Icon3d({
  name,
  size = 44,
  className,
}: {
  name: Icon3dName;
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={className ? `icon-3d ${className}` : "icon-3d"}
      src={`/icons-3d/${art[name]}.webp`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
    />
  );
}
