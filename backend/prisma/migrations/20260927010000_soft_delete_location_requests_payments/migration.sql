-- Refactor master data storage, tenant requests and payments:
--   1. soft delete  : is_deleted (false = aktif, true = dihapus) on every master data table
--   2. recycle bin  : recycle_bin dropped, its content folded into is_deleted
--   3. requests     : tenant_requests.tenantid -> locationid (relasi ke locations)
--   4. tenants      : drop mapX/mapY/mapW/mapH + mallFee (duplikat dari locations)
--   5. activity log : drop role (diturunkan dari users.levelid -> level.levelname)
--   6. payments     : tenant_payments baru, satu baris per tenant per bulan
-- Data is preserved: request lama dipetakan ke location milik tenant-nya dan
-- totalFee dihitung ulang memakai locations.pricePerYear / 12.

-- 1. soft delete columns
ALTER TABLE "users"           ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "level"           ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "floors"          ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "locations"       ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants"         ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events"          ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenant_requests" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "users_is_deleted_idx"           ON "users"("is_deleted");
CREATE INDEX IF NOT EXISTS "level_is_deleted_idx"           ON "level"("is_deleted");
CREATE INDEX IF NOT EXISTS "floors_is_deleted_idx"          ON "floors"("is_deleted");
CREATE INDEX IF NOT EXISTS "locations_is_deleted_idx"       ON "locations"("is_deleted");
CREATE INDEX IF NOT EXISTS "tenants_is_deleted_idx"         ON "tenants"("is_deleted");
CREATE INDEX IF NOT EXISTS "events_is_deleted_idx"          ON "events"("is_deleted");
CREATE INDEX IF NOT EXISTS "tenant_requests_is_deleted_idx" ON "tenant_requests"("is_deleted");

-- 2. fold recycle_bin content into is_deleted, then drop the table.
--    A recycle bin entry means the row was already hard-deleted, so the entry is
--    only kept as an audit trail in activity_logs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recycle_bin') THEN
    EXECUTE '
      UPDATE "tenants" t SET "is_deleted" = true
      FROM "recycle_bin" b
      WHERE b."entityType" = ''tenant'' AND b."entityId" = t."tenantid" AND t."is_deleted" = false
    ';
    EXECUTE '
      UPDATE "users" u SET "is_deleted" = true
      FROM "recycle_bin" b
      WHERE b."entityType" = ''user'' AND b."entityId" = u."userid" AND u."is_deleted" = false
    ';
    EXECUTE '
      UPDATE "locations" l SET "is_deleted" = true
      FROM "recycle_bin" b
      WHERE b."entityType" = ''location'' AND b."entityId" = l."id" AND l."is_deleted" = false
    ';
    EXECUTE '
      UPDATE "events" e SET "is_deleted" = true
      FROM "recycle_bin" b
      WHERE b."entityType" = ''event'' AND b."entityId" = e."eventid" AND e."is_deleted" = false
    ';
    EXECUTE '
      UPDATE "floors" f SET "is_deleted" = true
      FROM "recycle_bin" b
      WHERE b."entityType" = ''floor'' AND b."entityId" = f."floorid" AND f."is_deleted" = false
    ';
    EXECUTE '
      UPDATE "level" lv SET "is_deleted" = true
      FROM "recycle_bin" b
      WHERE b."entityType" = ''level'' AND b."entityId" = lv."levelid" AND lv."is_deleted" = false
    ';
    EXECUTE '
      INSERT INTO "activity_logs" ("datetime", "action", "email", "ip", "latitude", "longitude")
      SELECT b."deletedAt",
             ''PURGED '' || b."entityType" || '' #'' || b."entityId" || '' ('' || b."name" || '')'',
             b."deletedBy", b."ip", b."latitude", b."longitude"
      FROM "recycle_bin" b
      WHERE b."deletedAt" IS NOT NULL
    ';
    EXECUTE 'DROP TABLE "recycle_bin"';
  END IF;
END $$;

-- 3. tenant_requests.tenantid -> locationid
ALTER TABLE "tenant_requests" ADD COLUMN IF NOT EXISTS "locationid" INTEGER;

-- backfill: request menunjuk unit yang disewa tenant-nya
UPDATE "tenant_requests" r
SET "locationid" = t."locationid"
FROM "tenants" t
WHERE t."tenantid" = r."tenantid"
  AND r."locationid" IS NULL
  AND t."locationid" IS NOT NULL;

-- request dari tenant tanpa location (unit virtual) tetap disimpan sebagai
-- request terlantar, jadi kolom hanya jadi NOT NULL kalau semua row terpetakan.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "tenant_requests" WHERE "locationid" IS NULL) THEN
    ALTER TABLE "tenant_requests" ALTER COLUMN "locationid" SET NOT NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS "tenant_requests_tenantid_idx";
ALTER TABLE "tenant_requests" DROP CONSTRAINT IF EXISTS "tenant_requests_tenantid_fkey";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_requests_locationid_fkey') THEN
    ALTER TABLE "tenant_requests"
      ADD CONSTRAINT "tenant_requests_locationid_fkey"
      FOREIGN KEY ("locationid") REFERENCES "locations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "tenant_requests_locationid_idx" ON "tenant_requests"("locationid");

-- 4. tenants: posisi map & tarif sewa sekarang milik locations
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "mallFee";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "mapX";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "mapY";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "mapW";
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "mapH";

-- 4b. totalFee dihitung ulang dari harga tahunan location (bulan = tahun / 12),
--     memakai diskon durasi yang sama dengan simulasi di halaman Biaya.
UPDATE "tenant_requests" r
SET "totalFee" = GREATEST(
      ROUND(
        (COALESCE(l."pricePerYear", 0) / 12.0) * r."durationMonths" *
        (1 - CASE r."durationMonths"
              WHEN 3  THEN 0.02
              WHEN 6  THEN 0.05
              WHEN 12 THEN 0.10
              WHEN 24 THEN 0.15
              ELSE 0
            END)
      ), 0
    )
FROM "locations" l
WHERE l."id" = r."locationid";

-- 5. activity_logs: role diturunkan dari users -> level
DROP INDEX IF EXISTS "activity_logs_role_idx";
ALTER TABLE "activity_logs" DROP COLUMN IF EXISTS "role";

-- 6. tenant_payments
CREATE TABLE IF NOT EXISTS "tenant_payments" (
  "paymentid"  SERIAL PRIMARY KEY,
  "tenantid"   INTEGER NOT NULL REFERENCES "tenants"("tenantid") ON DELETE CASCADE ON UPDATE CASCADE,
  "locationid" INTEGER REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "period"     TEXT NOT NULL,
  "amount"     INTEGER NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'Unpaid',
  "method"     TEXT,
  "paidAt"     TIMESTAMPTZ,
  "notes"      TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_payments_tenantid_period_key"
  ON "tenant_payments"("tenantid", "period");
CREATE INDEX IF NOT EXISTS "tenant_payments_period_idx" ON "tenant_payments"("period");
CREATE INDEX IF NOT EXISTS "tenant_payments_status_idx" ON "tenant_payments"("status");
