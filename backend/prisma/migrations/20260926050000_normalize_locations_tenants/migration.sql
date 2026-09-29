-- Normalize locations <-> tenants:
--   locations : drop roomNumber / category / description, replace floor text with floorid FK
--   tenants   : drop unit, replace floorid with locationid FK
-- Data is preserved: every tenant unit becomes a Location row (named after the old
-- unit code, on the same floor and map position) and the tenant points at it.

-- 1. locations: add floorid and backfill it from the old floor text
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "floorid" INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'floor'
  ) THEN
    EXECUTE '
      UPDATE "locations" l
      SET "floorid" = f."floorid"
      FROM "floors" f
      WHERE f."floorname" = l."floor" AND l."floorid" IS NULL
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'locations_floorid_fkey'
  ) THEN
    ALTER TABLE "locations"
      ADD CONSTRAINT "locations_floorid_fkey"
      FOREIGN KEY ("floorid") REFERENCES "floors"("floorid")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "locations_floorid_idx" ON "locations"("floorid");

-- 2. drop the obsolete location columns (category is NOT NULL, so this must
--    happen before new location rows are inserted in step 3)
ALTER TABLE "locations" DROP COLUMN IF EXISTS "roomNumber" CASCADE;
ALTER TABLE "locations" DROP COLUMN IF EXISTS "category" CASCADE;
ALTER TABLE "locations" DROP COLUMN IF EXISTS "description" CASCADE;
ALTER TABLE "locations" DROP COLUMN IF EXISTS "floor" CASCADE;

-- 3. tenants: locationid, one location per legacy unit code
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "locationid" INTEGER;

DO $$
DECLARE
  t        RECORD;
  new_loc  INTEGER;
  reuse_id INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'unit'
  ) THEN
    FOR t IN
      SELECT "tenantid", "unit", "floorid", "mapX", "mapY"
      FROM "tenants"
      WHERE "locationid" IS NULL
      ORDER BY "tenantid"
    LOOP
      -- reuse an unclaimed location with the same name, otherwise create one
      SELECT "id" INTO reuse_id
      FROM "locations"
      WHERE "name" = t."unit"
        AND NOT EXISTS (SELECT 1 FROM "tenants" x WHERE x."locationid" = "locations"."id")
      ORDER BY "id"
      LIMIT 1;

      IF reuse_id IS NOT NULL THEN
        UPDATE "locations"
        SET "floorid" = COALESCE("floorid", t."floorid"),
            "x" = COALESCE("mapX", "x", 0),
            "y" = COALESCE("mapY", "y", 0)
        WHERE "id" = reuse_id;
        new_loc := reuse_id;
      ELSE
        INSERT INTO "locations" ("name", "floorid", "x", "y", "createdAt", "updatedAt")
        VALUES (t."unit", t."floorid", COALESCE(t."mapX", 0), COALESCE(t."mapY", 0), now(), now())
        RETURNING "id" INTO new_loc;
      END IF;

      UPDATE "tenants" SET "locationid" = new_loc WHERE "tenantid" = t."tenantid";
    END LOOP;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_locationid_key" ON "tenants"("locationid");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_locationid_fkey'
  ) THEN
    ALTER TABLE "tenants"
      ADD CONSTRAINT "tenants_locationid_fkey"
      FOREIGN KEY ("locationid") REFERENCES "locations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. drop the obsolete tenant columns
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "floorid" CASCADE;
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "unit" CASCADE;
