-- Hapus tabel floor_areas (zona denah A-xx). Penempatan tenant kini klik bebas di denah.
DROP INDEX IF EXISTS "floor_areas_floorid_code_key";
DROP INDEX IF EXISTS "floor_areas_floorid_idx";
DROP TABLE IF EXISTS "floor_areas";

DELETE FROM "recycle_bin" WHERE "entityType" = 'floorArea';
