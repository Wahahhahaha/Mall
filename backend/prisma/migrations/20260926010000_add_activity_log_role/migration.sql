-- AddActivityLogRole: simpan role dari frontend agar Activity Log bisa difilter per role.
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "role" TEXT;
CREATE INDEX IF NOT EXISTS "activity_logs_role_idx" ON "activity_logs" ("role");
