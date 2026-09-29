-- Payment method is no longer chosen at request time (payment happens after approval via Midtrans)
ALTER TABLE "tenant_requests" ALTER COLUMN "paymentMethod" DROP NOT NULL;