-- DropUnusedEventStatus: kolom status tidak lagi dipakai di form, card, dan detail event.
ALTER TABLE "events" DROP COLUMN IF EXISTS "status";
