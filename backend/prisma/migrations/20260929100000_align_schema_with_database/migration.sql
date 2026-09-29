-- Samakan constraint database dengan schema.prisma.
--
-- Dump `mall-backup-2026-09-29T08-47-20-109Z.sql` mendefinisikan kolom-kolom ini
-- sebagai nullable, sementara tabel di database masih memakai NOT NULL dari
-- constraint awal. Semua statement di bawah hanya melonggarkan constraint,
-- tidak menghapus data. Menjalankan migrasi ini pada database yang sudah
-- nullable tidak mengubah apa pun.
ALTER TABLE "users"            ALTER COLUMN "levelid" DROP NOT NULL;
ALTER TABLE "floors"           ALTER COLUMN "createdAt" DROP NOT NULL;
ALTER TABLE "locations"        ALTER COLUMN "createdAt" DROP NOT NULL;
ALTER TABLE "locations"        ALTER COLUMN "updatedAt" DROP NOT NULL;
ALTER TABLE "tenants"          ALTER COLUMN "category" DROP NOT NULL;
ALTER TABLE "tenants"          ALTER COLUMN "createdAt" DROP NOT NULL;
ALTER TABLE "events"           ALTER COLUMN "startDate" DROP NOT NULL;
ALTER TABLE "events"           ALTER COLUMN "endDate" DROP NOT NULL;
ALTER TABLE "events"           ALTER COLUMN "createdAt" DROP NOT NULL;
ALTER TABLE "parking_tickets"  ALTER COLUMN "entry_at" DROP NOT NULL;
ALTER TABLE "parking_tickets"  ALTER COLUMN "createdAt" DROP NOT NULL;
ALTER TABLE "settings"         ALTER COLUMN "updatedAt" DROP NOT NULL;
ALTER TABLE "tenant_requests"  ALTER COLUMN "businessCategory" DROP NOT NULL;
ALTER TABLE "tenant_requests"  ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE "tenant_requests"  ALTER COLUMN "createdAt" DROP NOT NULL;
ALTER TABLE "tenant_requests"  ALTER COLUMN "updatedAt" DROP NOT NULL;
