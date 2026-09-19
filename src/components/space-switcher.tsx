"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronDown, Plus } from "@/components/icons";

function hrefForSpace(pathname: string, spaceId: string) {
  if (pathname.startsWith("/celebrations")) return `/celebrations?space=${spaceId}`;
  if (pathname.startsWith("/users")) return `/users?space=${spaceId}`;
  if (pathname.startsWith("/templates")) return `/templates?space=${spaceId}`;
  if (pathname.startsWith("/providers")) return `/providers?space=${spaceId}`;
  if (pathname.startsWith("/settings")) return `/settings?space=${spaceId}`;
  if (pathname.startsWith("/help")) return `/help?space=${spaceId}`;
  if (pathname.startsWith("/account")) return `/account?space=${spaceId}`;
  if (pathname === "/new" || pathname.startsWith("/new?"))
    return `/new?space=${spaceId}`;
  if (pathname.startsWith("/spaces/new")) return `/spaces/new?space=${spaceId}`;
  if (pathname.startsWith("/spaces/")) return `/spaces/${spaceId}`;
  if (pathname.startsWith("/events/")) return `/celebrations?space=${spaceId}`;
  return `/dashboard?space=${spaceId}`;
}

export function SpaceSwitcher({
  spaces,
  spaceId,
}: {
  spaces: { id: string; name: string; kind: string }[];
  spaceId: string;
}) {
  const pathname = usePathname();
  const current = spaces.find((space) => space.id === spaceId) || spaces[0];
  const menu = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    menu.current?.removeAttribute("open");
  }

  useEffect(() => {
    menu.current?.removeAttribute("open");
  }, [spaceId, pathname]);

  return (
    <div className="space-switcher">
      <div className="space-label-row">
        <div className="space-label">YOUR SPACE</div>
        <Link href={`/spaces/new${spaceId ? `?space=${spaceId}` : ""}`} className="space-create-link">
          <Plus size={14} /> New
        </Link>
      </div>
      {current ? (
        <details className="space-switch" ref={menu}>
          <summary>
            <span className="space-avatar">
              {current.name.charAt(0).toUpperCase()}
            </span>
            <span>
              {current.name}
              <small>{current.kind.toLowerCase()} space</small>
            </span>
            <ChevronDown size={16} />
          </summary>
          <div className="space-switch-menu">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={hrefForSpace(pathname, space.id)}
                className={space.id === current.id ? "active-space" : ""}
                onClick={closeMenu}
              >
                <span className="space-avatar">
                  {space.name.charAt(0).toUpperCase()}
                </span>
                <span>
                  {space.name}
                  <small>{space.kind.toLowerCase()} space</small>
                </span>
              </Link>
            ))}
          </div>
        </details>
      ) : (
        <div className="space-placeholder">A home for your celebrations</div>
      )}
    </div>
  );
}
