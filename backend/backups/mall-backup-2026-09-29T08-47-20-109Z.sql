-- ================================================
-- Mall Management Information System - Database Backup
-- Exported: 2026-09-29T08:47:20.121Z
-- Format: SQL (PostgreSQL)
-- ================================================

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET timezone = 'UTC';

BEGIN;

TRUNCATE TABLE "level" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "level" ("levelid" SERIAL PRIMARY KEY, "levelname" TEXT NOT NULL UNIQUE, "is_deleted" BOOLEAN NOT NULL DEFAULT false);
INSERT INTO "level" ("levelid", "levelname", "isDeleted") VALUES
(1, 'Superadmin', FALSE),
(2, 'Admin', FALSE),
(3, 'Parkir', FALSE),
(4, 'Manager', FALSE),
(5, 'Tenant', FALSE);

TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "users" ("userid" SERIAL PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "password" TEXT NOT NULL, "levelid" INTEGER, "phone" TEXT, "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ);
INSERT INTO "users" ("userid", "email", "password", "levelid", "phone", "isDeleted", "createdAt") VALUES
(1, 'superadmin@mall.com', '$2b$10$AwtsZ9iQY0AoK4w1h3x4z.iwRpkbVfoRr6OwqEzgyNDC/eig1F2Aq', 1, NULL, FALSE, '2026-09-28T02:20:11.082Z'),
(2, 'admin@mall.com', '$2b$10$Wbyl4oBkV87jBvWyPdr9..ARH.tQVuJpfl/2Rlfi8.uGmKyz9kJsy', 2, NULL, FALSE, '2026-09-28T02:20:11.223Z'),
(3, 'parkir@mall.com', '$2b$10$pkIAn2H8tJgXv2MmfD.KJuwMjVhktoM118QO0oN1k0Ktp5wP8O966', 3, NULL, FALSE, '2026-09-28T02:20:11.367Z'),
(4, 'manager@mall.com', '$2b$10$WhR2FfmhRC9Qp7DAsmpXO.2w6hV4Padx/Q9bVHd4E8HE7iLQTmmYa', 4, NULL, FALSE, '2026-09-28T02:20:11.509Z'),
(5, 'tenant@mall.com', '$2b$10$c3YYSOeFQYFcGPlwpeILEOhljD4sjWKbJRsH7FgnAzTCsqM3ncKfe', 5, NULL, FALSE, '2026-09-28T02:20:11.650Z'),
(6, 'demo@mall.com', '$2b$10$CQ.ScZjF81Tcd0wOwArBNuVKPBDC.EGLzi3XIaoYLx7JzYbs5NLYa', 5, NULL, FALSE, '2026-09-28T02:20:11.796Z'),
(7, 'demouser@mall.com', '$2b$10$r7Bia0kMpK65yQqN4uiTq.LHbWrrWEMIb9PDxypQ5UjZK/7lC/6ni', 5, NULL, TRUE, '2026-09-28T02:20:11.945Z');

TRUNCATE TABLE "floors" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "floors" ("floorid" SERIAL PRIMARY KEY, "floorname" TEXT NOT NULL UNIQUE, "floorcode" TEXT UNIQUE, "sortOrder" INTEGER NOT NULL DEFAULT 0, "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ);
INSERT INTO "floors" ("floorid", "floorname", "floorcode", "sortOrder", "createdAt", "isDeleted") VALUES
(1, 'Lower Ground', 'LG', 0, '2026-09-28T02:20:11.950Z', FALSE),
(2, 'Ground Floor', 'GF', 1, '2026-09-28T02:20:11.956Z', FALSE),
(3, '1 Floor', '1F', 2, '2026-09-28T02:20:11.969Z', FALSE),
(4, '2 Floor', '2F', 3, '2026-09-28T02:20:11.974Z', FALSE),
(5, '3 Floor', '3F', 4, '2026-09-28T02:20:11.980Z', FALSE);

TRUNCATE TABLE "locations" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "locations" ("id" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "floorid" INTEGER REFERENCES "floors"("floorid") ON DELETE SET NULL, "x" DOUBLE PRECISION NOT NULL, "y" DOUBLE PRECISION NOT NULL, "pricePerYear" INTEGER DEFAULT 50000000, "minLeaseYears" INTEGER NOT NULL DEFAULT 1, "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ, "updatedAt" TIMESTAMPTZ);
INSERT INTO "locations" ("id", "name", "floorid", "x", "y", "pricePerYear", "minLeaseYears", "isDeleted", "createdAt", "updatedAt") VALUES
(3, 'LG-01', 1, 2169, 2263, 40000000, 1, FALSE, '2026-09-28T02:20:12.018Z', '2026-09-28T20:59:30.882Z'),
(6, '1F-02', 3, 2300, 700, 95000000, 1, FALSE, '2026-09-28T02:20:12.044Z', '2026-09-28T16:27:59.829Z'),
(7, '2F-05', 4, 4700, 700, 150000000, 1, FALSE, '2026-09-28T02:20:12.052Z', '2026-09-28T16:27:59.831Z'),
(8, '3F-01', 5, 3300, 4300, 60000000, 1, FALSE, '2026-09-28T02:20:12.058Z', '2026-09-28T16:27:59.834Z'),
(14, 'C-02', 2, 3200, 1600, 90000000, 1, FALSE, '2026-09-29T00:48:03.238Z', '2026-09-29T00:48:03.238Z'),
(13, 'C-01', 2, 2209, 1840, 100000000, 1, FALSE, '2026-09-29T00:48:03.238Z', '2026-09-29T00:55:44.652Z'),
(11, 'B-02', 2, 2270, 2270, 120000000, 1, FALSE, '2026-09-29T00:48:03.238Z', '2026-09-29T00:55:47.831Z'),
(18, 'E-01', 2, 2247, 2431, 125000000, 1, FALSE, '2026-09-29T00:48:03.238Z', '2026-09-29T00:55:49.900Z'),
(19, 'E-02', 2, 2246, 2637, 85000000, 1, FALSE, '2026-09-29T00:48:03.238Z', '2026-09-29T00:55:52.420Z'),
(12, 'B-03', 2, 2142, 3105, 130000000, 1, FALSE, '2026-09-29T00:48:03.238Z', '2026-09-29T00:55:57.420Z'),
(5, 'GF-12', 2, 2162, 3281, 120000000, 1, FALSE, '2026-09-28T02:20:12.037Z', '2026-09-29T00:56:00.277Z'),
(4, 'GF-10', 2, 3431, 3220, 75000000, 1, FALSE, '2026-09-28T02:20:12.029Z', '2026-09-29T00:56:02.266Z'),
(17, 'D-02', 2, 3386, 2984, 95000000, 1, FALSE, '2026-09-29T00:48:03.238Z', '2026-09-29T00:56:04.636Z'),
(16, 'D-01', 2, 3252, 2701, 160000000, 1, FALSE, '2026-09-29T00:48:03.238Z', '2026-09-29T00:56:07.075Z'),
(15, 'C-03', 2, 3242, 2163, 105000000, 1, FALSE, '2026-09-29T00:48:03.238Z', '2026-09-29T00:56:12.896Z'),
(2, 'A-02', 2, 2848, 1592, 55000000, 1, FALSE, '2026-09-28T02:20:12.006Z', '2026-09-29T00:56:22.032Z'),
(1, 'A-01', 2, 2048, 1686, 60000000, 1, FALSE, '2026-09-28T02:20:11.994Z', '2026-09-29T00:56:26.929Z'),
(10, 'B-01', 2, 1572, 1379, 110000000, 1, FALSE, '2026-09-29T00:48:03.238Z', '2026-09-29T00:56:40.710Z');

TRUNCATE TABLE "tenants" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "tenants" ("tenantid" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "category" TEXT, "logoUrl" TEXT, "leaseUntil" TIMESTAMPTZ, "locationid" INTEGER UNIQUE REFERENCES "locations"("id") ON DELETE SET NULL, "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ);
INSERT INTO "tenants" ("tenantid", "name", "category", "logoUrl", "leaseUntil", "locationid", "isDeleted", "createdAt") VALUES
(2, 'Uniqlo', 'Fashion', NULL, '2027-12-31T00:00:00.000Z', 5, FALSE, '2026-09-28T02:20:12.129Z'),
(3, 'Zara', 'Fashion', NULL, '2028-01-15T00:00:00.000Z', 6, FALSE, '2026-09-28T02:20:12.139Z'),
(4, 'Cinema XXI', 'Entertainment', NULL, '2030-10-20T00:00:00.000Z', 7, FALSE, '2026-09-28T02:20:12.148Z'),
(5, 'Food Court Nusantara', 'F&B', NULL, '2027-06-30T00:00:00.000Z', 8, FALSE, '2026-09-28T02:20:12.156Z'),
(1, 'Starbucks Coffee', 'F&B', NULL, '2027-10-01T00:00:00.000Z', 4, FALSE, '2026-09-28T02:20:12.118Z'),
(12, 'aw', 'Retail', NULL, '2027-09-28T00:00:00.000Z', 3, FALSE, '2026-09-28T20:47:40.809Z'),
(13, 'Miniso', 'Fashion', NULL, NULL, 10, FALSE, '2026-09-29T00:48:03.238Z'),
(14, 'Sephora', 'Beauty', NULL, NULL, 11, FALSE, '2026-09-29T00:48:03.238Z'),
(15, 'Gramedia', 'Electronics', NULL, NULL, 12, FALSE, '2026-09-29T00:48:03.238Z'),
(16, 'Pizza Hut', 'F&B', NULL, NULL, 13, FALSE, '2026-09-29T00:48:03.238Z'),
(17, 'J.Co Donuts', 'F&B', NULL, NULL, 14, FALSE, '2026-09-29T00:48:03.238Z'),
(18, 'Chatime', 'F&B', NULL, NULL, 15, FALSE, '2026-09-29T00:48:03.238Z'),
(19, 'Ace Hardware', 'Furniture', NULL, NULL, 16, FALSE, '2026-09-29T00:48:03.238Z'),
(20, 'Timezone', 'Entertainment', NULL, NULL, 17, FALSE, '2026-09-29T00:48:03.238Z'),
(21, 'ERHA Clinic', 'Beauty', NULL, NULL, 18, FALSE, '2026-09-29T00:48:03.238Z'),
(22, 'KFC', 'F&B', NULL, NULL, 19, FALSE, '2026-09-29T00:48:03.238Z');

TRUNCATE TABLE "events" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "events" ("eventid" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT, "floorid" INTEGER REFERENCES "floors"("floorid") ON DELETE SET NULL, "location" TEXT NOT NULL, "startDate" TIMESTAMPTZ, "endDate" TIMESTAMPTZ, "posters" TEXT[] DEFAULT ARRAY[]::TEXT[], "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ);
INSERT INTO "events" ("eventid", "name", "description", "floorid", "location", "startDate", "endDate", "posters", "isDeleted", "createdAt") VALUES
(2, 'Pameran Otomotif Monokrom', NULL, 2, 'Atrium Utara', '2026-09-02T00:00:00.000Z', '2026-09-08T00:00:00.000Z', '', FALSE, '2026-09-28T02:20:12.092Z'),
(3, 'Live Acoustic Music', NULL, 2, 'Terrace 2F', '2026-08-29T00:00:00.000Z', '2026-08-29T00:00:00.000Z', '', FALSE, '2026-09-28T02:20:12.102Z'),
(4, 'Festival Kuliner Nusantara', NULL, 2, 'Outdoor Parking B', '2026-09-15T00:00:00.000Z', '2026-09-22T00:00:00.000Z', '', FALSE, '2026-09-28T02:20:12.111Z'),
(1, 'Midnight Sale Ritel', NULL, 2, 'Atrium Utama', '2026-08-28T00:00:00.000Z', '2026-08-30T00:00:00.000Z', '', FALSE, '2026-09-28T02:20:12.071Z');

TRUNCATE TABLE "parking_tickets" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "parking_tickets" ("ticketid" SERIAL PRIMARY KEY, "plate" TEXT NOT NULL, "type" TEXT NOT NULL, "entryAt" TIMESTAMPTZ, "exitAt" TIMESTAMPTZ, "fee" INTEGER, "entryBy" INTEGER, "exitBy" INTEGER, "createdAt" TIMESTAMPTZ);
INSERT INTO "parking_tickets" ("ticketid", "plate", "type", "entryAt", "exitAt", "fee", "entryBy", "exitBy", "createdAt") VALUES
(1, 'B 1234 XYZ', 'Roda 4', '2026-09-28T01:28:12.195Z', NULL, NULL, NULL, NULL, '2026-09-28T02:20:12.198Z'),
(2, 'D 5678 ABC', 'Roda 2', '2026-09-27T23:13:12.195Z', NULL, NULL, NULL, NULL, '2026-09-28T02:20:12.205Z'),
(3, 'B 9012 DEF', 'Roda 2', '2026-09-28T02:13:12.195Z', NULL, NULL, NULL, NULL, '2026-09-28T02:20:12.209Z'),
(4, 'L 4455 GH', 'Roda 4', '2026-09-28T00:00:12.195Z', NULL, NULL, NULL, NULL, '2026-09-28T02:20:12.214Z'),
(5, 'B 7777 QQ', 'Roda 4', '2026-09-27T21:00:12.195Z', '2026-09-28T01:20:12.195Z', 9000, NULL, NULL, '2026-09-28T02:20:12.222Z'),
(6, 'B 1234 XYZ', 'Roda 4', '2026-09-28T15:35:59.859Z', NULL, NULL, NULL, NULL, '2026-09-28T16:27:59.861Z'),
(7, 'D 5678 ABC', 'Roda 2', '2026-09-28T13:20:59.859Z', NULL, NULL, NULL, NULL, '2026-09-28T16:27:59.865Z'),
(8, 'B 9012 DEF', 'Roda 2', '2026-09-28T16:20:59.859Z', NULL, NULL, NULL, NULL, '2026-09-28T16:27:59.866Z'),
(10, 'B 7777 QQ', 'Roda 4', '2026-09-28T11:07:59.859Z', '2026-09-28T15:27:59.859Z', 9000, NULL, NULL, '2026-09-28T16:27:59.870Z'),
(11, 'B11233', 'Roda 2', '2026-09-29T06:04:05.116Z', NULL, NULL, 1, NULL, '2026-09-29T06:04:05.116Z'),
(9, 'L 4455 GH', 'Roda 4', '2026-09-28T14:07:59.859Z', '2026-09-29T06:42:55.715Z', 35000, NULL, 1, '2026-09-28T16:27:59.868Z');

TRUNCATE TABLE "settings" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "settings" ("id" INTEGER NOT NULL DEFAULT 1, "systemName" TEXT NOT NULL DEFAULT 'SIM MALL', "systemLogo" TEXT, "systemFavicon" TEXT, "systemContact" TEXT, "systemAddress" TEXT, "logoMode" BOOLEAN NOT NULL DEFAULT false, "updatedAt" TIMESTAMPTZ);
INSERT INTO "settings" ("id", "systemName", "systemLogo", "systemFavicon", "systemContact", "systemAddress", "logoMode", "updatedAt") VALUES
(1, 'Cherishe', '/uploads/img-1790566905518-559904099.png', NULL, '+62 21 555 0123 | admin@mall.com', 'Jl. Boulevard Raya No. 45', TRUE, '2026-09-29T06:08:19.423Z');

TRUNCATE TABLE "tenant_requests" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "tenant_requests" ("id" SERIAL PRIMARY KEY, "userid" INTEGER NOT NULL, "locationid" INTEGER NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE, "durationMonths" INTEGER NOT NULL, "totalFee" INTEGER NOT NULL, "paymentMethod" TEXT, "businessName" TEXT NOT NULL, "businessCategory" TEXT, "description" TEXT, "phone" TEXT, "status" TEXT DEFAULT 'Pending', "contractStart" TIMESTAMPTZ, "is_deleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMPTZ, "updatedAt" TIMESTAMPTZ);
INSERT INTO "tenant_requests" ("id", "userid", "locationid", "durationMonths", "totalFee", "paymentMethod", "businessName", "businessCategory", "description", "phone", "status", "contractStart", "isDeleted", "createdAt", "updatedAt") VALUES
(1, 6, 4, 12, 67500000, 'Bank Transfer', 'Kopi Kenangan Demo', 'F&B', 'Pengajuan sewa gerai F&B durasi 12 bulan (1 tahun)', '+62 812 3456 7890', 'Approved', '2026-10-01T00:00:00.000Z', FALSE, '2026-09-28T02:20:12.173Z', '2026-09-28T17:10:41.750Z'),
(10, 5, 3, 12, 39999996, NULL, 'aw', 'Retail', 'ssassas', '75', 'Approved', '2026-09-28T00:00:00.000Z', FALSE, '2026-09-28T20:47:27.285Z', '2026-09-28T20:47:44.479Z'),
(11, 5, 1, 20, 100000000, NULL, 'Mimi', 'Fashion', 'PIC: namamaa | asa', '082131', 'Pending', '2026-09-29T00:00:00.000Z', FALSE, '2026-09-29T06:09:11.446Z', '2026-09-29T06:09:11.446Z');

TRUNCATE TABLE "tenant_payments" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "tenant_payments" ("paymentid" SERIAL PRIMARY KEY, "tenantid" INTEGER NOT NULL REFERENCES "tenants"("tenantid") ON DELETE CASCADE, "locationid" INTEGER REFERENCES "locations"("id") ON DELETE SET NULL, "period" TEXT NOT NULL, "amount" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'Unpaid', "method" TEXT, "paidAt" TIMESTAMPTZ, "notes" TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now());
INSERT INTO "tenant_payments" ("paymentid", "tenantid", "locationid", "period", "amount", "status", "method", "paidAt", "notes", "orderId", "payUrl", "createdAt", "updatedAt") VALUES
(29, 1, 4, '2026-10', 6250000, 'Unpaid', NULL, NULL, NULL, NULL, NULL, '2026-09-28T17:10:37.185Z', '2026-09-28T17:10:37.185Z'),
(30, 12, 3, '2026-09', 3333333, 'Paid', NULL, '2026-09-28T20:56:08.336Z', NULL, NULL, NULL, '2026-09-28T20:47:40.816Z', '2026-09-28T20:56:08.337Z');

TRUNCATE TABLE "activity_logs" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "activity_logs" ("id" SERIAL PRIMARY KEY, "datetime" TIMESTAMPTZ NOT NULL DEFAULT now(), "ip" TEXT, "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION, "userid" INTEGER REFERENCES "users"("userid") ON DELETE SET NULL, "email" TEXT, "action" TEXT NOT NULL);
INSERT INTO "activity_logs" ("id", "datetime", "ip", "latitude", "longitude", "userid", "email", "action") VALUES
(1, '2026-09-28T02:20:12.188Z', '127.0.0.1', -6.2088, 106.8456, 6, 'demo@mall.com', 'LOGIN — Demo user successfully logged in'),
(2, '2026-09-28T02:57:23.215Z', '182.253.9.66', 1.136323825336832, 104.0256547515363, 1, 'superadmin@mall.com', 'REORDER floors [2,1,3,4,5]'),
(3, '2026-09-28T02:57:24.828Z', '182.253.9.66', 1.136323825336832, 104.0256547515363, 1, 'superadmin@mall.com', 'REORDER floors [1,2,3,4,5]'),
(4, '2026-09-28T12:47:41.919Z', NULL, NULL, NULL, NULL, NULL, 'RESTORE event #1 (Midnight Sale Ritel)'),
(5, '2026-09-28T12:56:53.361Z', NULL, NULL, NULL, NULL, NULL, 'DELETE event #1 (Midnight Sale Ritel)'),
(6, '2026-09-28T12:56:53.517Z', NULL, NULL, NULL, NULL, NULL, 'RESTORE event #1 (Midnight Sale Ritel)'),
(11, '2026-09-28T13:47:42.469Z', NULL, NULL, NULL, NULL, NULL, 'DELETE event #1 (Midnight Sale Ritel)'),
(12, '2026-09-28T13:47:42.756Z', NULL, NULL, NULL, NULL, NULL, 'RESTORE event #1 (Midnight Sale Ritel)'),
(13, '2026-09-28T15:13:36.357Z', NULL, NULL, NULL, NULL, NULL, 'PURGE request #5 (Test Join Request)'),
(14, '2026-09-28T15:29:37.795Z', NULL, NULL, NULL, NULL, NULL, 'PURGE request #6 (Durasi Test)'),
(15, '2026-09-28T15:29:38.248Z', NULL, NULL, NULL, NULL, NULL, 'PURGE request #8 (Durasi Test)'),
(16, '2026-09-28T15:30:37.209Z', NULL, NULL, NULL, NULL, NULL, 'PURGE request #7 (Durasi Test)'),
(17, '2026-09-28T15:36:04.778Z', NULL, NULL, NULL, NULL, NULL, 'PURGE request #9 (NoDisc Test)'),
(18, '2026-09-28T21:00:16.565Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(19, '2026-09-28T21:00:17.430Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(20, '2026-09-28T21:01:13.159Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #3 (Parkir) — 41 rules'),
(21, '2026-09-28T21:01:16.214Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(22, '2026-09-28T21:01:17.984Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #3 (Parkir) — 41 rules'),
(23, '2026-09-28T21:01:19.942Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(24, '2026-09-28T21:01:24.796Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(25, '2026-09-28T21:01:27.140Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(26, '2026-09-28T21:01:28.649Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(27, '2026-09-28T21:01:31.832Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(28, '2026-09-28T21:01:33.541Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(29, '2026-09-28T21:01:33.640Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(30, '2026-09-28T21:01:35.150Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(31, '2026-09-28T21:01:36.505Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(32, '2026-09-28T21:01:37.859Z', '202.43.231.185', 1.129333900103386, 104.0090762376583, 1, 'superadmin@mall.com', 'UPDATE permissions #4 (Manager) — 41 rules'),
(33, '2026-09-28T23:53:47.095Z', '202.43.231.185', NULL, NULL, 1, 'superadmin@mall.com', 'DELETE user #7 (demouser@mall.com)'),
(34, '2026-09-29T06:07:51.555Z', '182.253.9.66', 1.136343228200563, 104.025669145899, 1, 'superadmin@mall.com', 'UPDATE permissions #1 (Superadmin) — 41 rules'),
(35, '2026-09-29T06:07:51.876Z', '182.253.9.66', 1.136343228200563, 104.025669145899, 1, 'superadmin@mall.com', 'UPDATE permissions #1 (Superadmin) — 41 rules'),
(36, '2026-09-29T06:07:53.044Z', '182.253.9.66', 1.136343228200563, 104.025669145899, 1, 'superadmin@mall.com', 'UPDATE permissions #1 (Superadmin) — 41 rules'),
(37, '2026-09-29T06:07:53.787Z', '182.253.9.66', 1.136343228200563, 104.025669145899, 1, 'superadmin@mall.com', 'UPDATE permissions #1 (Superadmin) — 41 rules'),
(38, '2026-09-29T06:08:02.647Z', '182.253.9.66', 1.136343228200563, 104.025669145899, 1, 'superadmin@mall.com', 'UPDATE permissions #1 (Superadmin) — 41 rules'),
(39, '2026-09-29T06:08:03.710Z', '182.253.9.66', 1.136343228200563, 104.025669145899, 1, 'superadmin@mall.com', 'UPDATE permissions #1 (Superadmin) — 41 rules'),
(40, '2026-09-29T06:08:05.068Z', '182.253.9.66', 1.136343228200563, 104.025669145899, 1, 'superadmin@mall.com', 'UPDATE permissions #1 (Superadmin) — 41 rules'),
(41, '2026-09-29T06:08:06.381Z', '182.253.9.66', 1.136343228200563, 104.025669145899, 1, 'superadmin@mall.com', 'UPDATE permissions #1 (Superadmin) — 41 rules');

COMMIT;
