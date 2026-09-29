-- settings: ganti pola key/value menjadi kolom tetap.
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "systemName" TEXT;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "systemLogo" TEXT;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "systemFavicon" TEXT;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "systemContact" TEXT;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "systemAddress" TEXT;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "logoMode" BOOLEAN NOT NULL DEFAULT false;

-- Pindahkan nilai lama (key/value) ke kolom baru selama kolom lama masih ada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'key'
  ) THEN
    EXECUTE $mig$
      UPDATE "settings" SET
        "systemName"    = COALESCE("systemName",    (SELECT value FROM settings s WHERE s.key = 'app_name'    LIMIT 1)),
        "systemLogo"    = COALESCE("systemLogo",    (SELECT value FROM settings s WHERE s.key = 'app_logo'    LIMIT 1)),
        "systemFavicon" = COALESCE("systemFavicon", (SELECT value FROM settings s WHERE s.key = 'app_favicon' LIMIT 1)),
        "systemContact" = COALESCE(
                            "systemContact",
                            concat_ws(' | ',
                              NULLIF((SELECT value FROM settings s WHERE s.key = 'phone' LIMIT 1), ''),
                              NULLIF((SELECT value FROM settings s WHERE s.key = 'email' LIMIT 1), '')
                            )
                          ),
        "systemAddress" = COALESCE("systemAddress", (SELECT value FROM settings s WHERE s.key = 'address'    LIMIT 1)),
        "logoMode"      = COALESCE("logoMode", (SELECT value FROM settings s WHERE s.key = 'brand_mode' LIMIT 1) = 'logo')
    $mig$;
  END IF;
END $$;

-- Sisakan satu baris (id = 1) sebagai satu-satunya record konfigurasi
DO $$
DECLARE
  keep_id INTEGER;
BEGIN
  SELECT MIN(id) INTO keep_id FROM "settings";

  IF keep_id IS NULL THEN
    INSERT INTO "settings" (id, "systemName") VALUES (1, 'SIM MALL');
  ELSE
    DELETE FROM "settings" WHERE id <> keep_id;
    UPDATE "settings" SET id = 1 WHERE id = keep_id;
  END IF;

  UPDATE "settings" SET "systemName" = COALESCE(NULLIF("systemName", ''), 'SIM MALL') WHERE id = 1;

  EXECUTE 'SELECT setval(pg_get_serial_sequence(''settings'', ''id''), 1, true)';
END $$;

ALTER TABLE "settings" DROP COLUMN IF EXISTS "key";
ALTER TABLE "settings" DROP COLUMN IF EXISTS "value";
