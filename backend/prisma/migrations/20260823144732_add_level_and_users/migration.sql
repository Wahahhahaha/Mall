/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "userid" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "levelid" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userid")
);

-- CreateTable
CREATE TABLE "level" (
    "levelid" SERIAL NOT NULL,
    "levelname" TEXT NOT NULL,

    CONSTRAINT "level_pkey" PRIMARY KEY ("levelid")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "level_levelname_key" ON "level"("levelname");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_levelid_fkey" FOREIGN KEY ("levelid") REFERENCES "level"("levelid") ON DELETE RESTRICT ON UPDATE CASCADE;
