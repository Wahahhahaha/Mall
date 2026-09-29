-- activity_logs: tambah userid (FK ke users) dan ganti kolom "user" menjadi "email".
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "userid" INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_logs' AND column_name = 'user'
  ) THEN
    ALTER TABLE "activity_logs" RENAME COLUMN "user" TO "email";
  END IF;
END $$;

-- Backfill userid dari email yang sudah ada
UPDATE "activity_logs" a
SET "userid" = u."userid"
FROM "users" u
WHERE a."userid" IS NULL
  AND a."email" IS NOT NULL
  AND lower(trim(a."email")) = lower(u."email");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_userid_fkey'
  ) THEN
    ALTER TABLE "activity_logs"
      ADD CONSTRAINT "activity_logs_userid_fkey"
      FOREIGN KEY ("userid") REFERENCES "users"("userid") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "activity_logs_userid_idx" ON "activity_logs" ("userid");
CREATE INDEX IF NOT EXISTS "activity_logs_email_idx" ON "activity_logs" ("email");
