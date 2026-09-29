-- tenant_requests is now linked to a unit (locationid); the tenantid column was
-- already detached in the previous migration but the column itself was left
-- behind as NOT NULL, which broke every INSERT.
ALTER TABLE "tenant_requests" DROP COLUMN IF EXISTS "tenantid";
