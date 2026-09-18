-- Space roles and membership/invitation roleId migration
CREATE TABLE "SpaceRole" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemKey" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpaceRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpaceRole_spaceId_name_key" ON "SpaceRole"("spaceId", "name");
CREATE INDEX "SpaceRole_spaceId_idx" ON "SpaceRole"("spaceId");

ALTER TABLE "SpaceRole" ADD CONSTRAINT "SpaceRole_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed system roles for existing spaces
INSERT INTO "SpaceRole" ("id", "spaceId", "name", "systemKey", "isSystem", "permissions", "createdAt")
SELECT
  md5(s.id || ':OWNER') || substr(md5(random()::text), 1, 8),
  s.id,
  'Owner',
  'OWNER',
  true,
  '["dashboard.view","events.read","events.write","events.delete","guests.manage","budget.manage","vendors.manage","settings.manage","users.manage","billing.manage"]'::jsonb,
  CURRENT_TIMESTAMP
FROM "Space" s;

INSERT INTO "SpaceRole" ("id", "spaceId", "name", "systemKey", "isSystem", "permissions", "createdAt")
SELECT
  md5(s.id || ':ADMIN') || substr(md5(random()::text), 1, 8),
  s.id,
  'Administrator',
  'ADMIN',
  true,
  '["dashboard.view","events.read","events.write","events.delete","guests.manage","budget.manage","vendors.manage","settings.manage","users.manage"]'::jsonb,
  CURRENT_TIMESTAMP
FROM "Space" s;

INSERT INTO "SpaceRole" ("id", "spaceId", "name", "systemKey", "isSystem", "permissions", "createdAt")
SELECT
  md5(s.id || ':EDITOR') || substr(md5(random()::text), 1, 8),
  s.id,
  'Editor',
  'EDITOR',
  true,
  '["dashboard.view","events.read","events.write","guests.manage","budget.manage","vendors.manage"]'::jsonb,
  CURRENT_TIMESTAMP
FROM "Space" s;

INSERT INTO "SpaceRole" ("id", "spaceId", "name", "systemKey", "isSystem", "permissions", "createdAt")
SELECT
  md5(s.id || ':VIEWER') || substr(md5(random()::text), 1, 8),
  s.id,
  'Viewer',
  'VIEWER',
  true,
  '["dashboard.view","events.read"]'::jsonb,
  CURRENT_TIMESTAMP
FROM "Space" s;

ALTER TABLE "Membership" ADD COLUMN "roleId" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "roleId" TEXT;

UPDATE "Membership" m
SET "roleId" = r.id
FROM "SpaceRole" r
WHERE r."spaceId" = m."spaceId"
  AND r."systemKey" = UPPER(m."role");

UPDATE "Invitation" i
SET "roleId" = r.id
FROM "SpaceRole" r
WHERE r."spaceId" = i."spaceId"
  AND r."systemKey" = UPPER(i."role");

-- Fallback any unmatched memberships/invites to VIEWER
UPDATE "Membership" m
SET "roleId" = r.id
FROM "SpaceRole" r
WHERE m."roleId" IS NULL
  AND r."spaceId" = m."spaceId"
  AND r."systemKey" = 'VIEWER';

UPDATE "Invitation" i
SET "roleId" = r.id
FROM "SpaceRole" r
WHERE i."roleId" IS NULL
  AND r."spaceId" = i."spaceId"
  AND r."systemKey" = 'VIEWER';

ALTER TABLE "Membership" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "Invitation" ALTER COLUMN "roleId" SET NOT NULL;

ALTER TABLE "Membership" DROP COLUMN "role";
ALTER TABLE "Invitation" DROP COLUMN "role";

CREATE INDEX "Membership_roleId_idx" ON "Membership"("roleId");
CREATE INDEX "Invitation_roleId_idx" ON "Invitation"("roleId");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "SpaceRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "SpaceRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
