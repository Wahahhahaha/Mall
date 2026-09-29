-- CreateTable
CREATE TABLE "parking_tickets" (
    "ticketid" SERIAL NOT NULL,
    "plate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entry_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exit_at" TIMESTAMP(3),
    "fee" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parking_tickets_pkey" PRIMARY KEY ("ticketid")
);

-- CreateIndex
CREATE INDEX "parking_tickets_plate_exit_at_idx" ON "parking_tickets"("plate", "exit_at");
