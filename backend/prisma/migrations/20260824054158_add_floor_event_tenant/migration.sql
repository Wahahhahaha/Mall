-- AlterTable
ALTER TABLE "level" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "floors" (
    "floorid" SERIAL NOT NULL,
    "floorname" TEXT NOT NULL,
    "floorcode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("floorid")
);

-- CreateTable
CREATE TABLE "events" (
    "eventid" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("eventid")
);

-- CreateTable
CREATE TABLE "tenants" (
    "tenantid" SERIAL NOT NULL,
    "unit" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "leaseUntil" TIMESTAMP(3),
    "floorid" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("tenantid")
);

-- CreateIndex
CREATE UNIQUE INDEX "floors_floorname_key" ON "floors"("floorname");

-- CreateIndex
CREATE UNIQUE INDEX "floors_floorcode_key" ON "floors"("floorcode");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_unit_key" ON "tenants"("unit");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_floorid_fkey" FOREIGN KEY ("floorid") REFERENCES "floors"("floorid") ON DELETE SET NULL ON UPDATE CASCADE;
