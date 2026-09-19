-- CreateTable
CREATE TABLE "SpaceBrand" (
    "spaceId" TEXT NOT NULL,
    "logoBytes" BYTEA,
    "logoMime" TEXT,
    "faviconBytes" BYTEA,
    "faviconMime" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceBrand_pkey" PRIMARY KEY ("spaceId")
);

-- AddForeignKey
ALTER TABLE "SpaceBrand" ADD CONSTRAINT "SpaceBrand_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
