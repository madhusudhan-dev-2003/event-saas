"use client";

import { useEffect } from "react";

export function BrandFavicon({
  spaceId,
  hasFavicon,
  rev,
}: {
  spaceId: string;
  hasFavicon: boolean;
  rev: number;
}) {
  useEffect(() => {
    const href = hasFavicon
      ? `/api/brand/favicon?space=${encodeURIComponent(spaceId)}&v=${rev}`
      : "/favicon.ico";
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [spaceId, hasFavicon, rev]);
  return null;
}
