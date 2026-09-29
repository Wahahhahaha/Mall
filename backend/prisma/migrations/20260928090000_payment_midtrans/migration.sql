-- Add Midtrans payment tracking fields to tenant_payments
ALTER TABLE "tenant_payments" ADD COLUMN "orderId" TEXT;
ALTER TABLE "tenant_payments" ADD COLUMN "payUrl" TEXT;

CREATE INDEX "tenant_payments_orderId_idx" ON "tenant_payments"("orderId");