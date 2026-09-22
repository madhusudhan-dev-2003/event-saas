import { db } from "@/lib/db";

export const LOGO_MAX_BYTES = 1024 * 1024;
export const FAVICON_MAX_BYTES = 256 * 1024;
export const BRAND_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const;

export function isBrandImageType(type: string) {
  return (BRAND_IMAGE_TYPES as readonly string[]).includes(type);
}

export async function getSpaceBrandMeta(spaceId: string) {
  if (!spaceId || !process.env.DATABASE_URL) return null;
  const brand = await db.spaceBrand.findUnique({
    where: { spaceId },
    select: {
      logoMime: true,
      faviconMime: true,
      updatedAt: true,
    },
  });
  if (!brand) return null;
  return {
    hasLogo: Boolean(brand.logoMime && brand.logoMime.length),
    hasFavicon: Boolean(brand.faviconMime && brand.faviconMime.length),
    rev: brand.updatedAt.getTime(),
  };
}
