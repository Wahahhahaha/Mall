-- DropColumn
ALTER TABLE "level" DROP COLUMN IF EXISTS "description";

-- Add tenant logo & mall fee
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mallFee" INTEGER;

-- CreateTable settings
CREATE TABLE IF NOT EXISTS "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "settings_key_key" ON "settings"("key");
