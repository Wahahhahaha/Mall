-- ================================================
-- Mall Management Information System - Database Backup
-- Exported: 2026-09-10T01:00:24.117Z
-- Format: SQL (PostgreSQL)
-- ================================================

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET timezone = 'UTC';

BEGIN;

TRUNCATE TABLE "levels" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "levels" ("levelid" SERIAL PRIMARY KEY, "levelname" TEXT NOT NULL UNIQUE);
INSERT INTO "levels" ("levelid", "levelname") VALUES
(1, 'Superadmin'),
(2, 'Admin'),
(3, 'Parkir'),
(4, 'Manager'),
(5, 'Tenant');

TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "users" ("userid" SERIAL PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "password" TEXT NOT NULL, "levelid" INTEGER, "phone" TEXT, "createdAt" TIMESTAMPTZ);
INSERT INTO "users" ("userid", "email", "password", "levelid", "phone", "createdAt") VALUES
(3, 'admin@mall.com', '$2b$10$8J9dA4e/vJpZyO9RN3XgzeMp6AZumBzbDGvds0Pw7d0A./LTTCLMq', 2, NULL, '2026-08-23T14:51:02.996Z'),
(4, 'parkir@mall.com', '$2b$10$oU6tvVaHNaOqsJL7irVyS.7sKSu45CpthtkbYF6LFWK1W4wB3P1W.', 3, NULL, '2026-08-23T14:51:03.092Z'),
(5, 'manager@mall.com', '$2b$10$M6AbA94o4qq3u/ughPJ6WO40.yuDGShJQfX7a/S5NnSLRc6Vtu1ea', 4, NULL, '2026-08-23T14:51:02.521Z'),
(6, 'tenant@mall.com', '$2b$10$Ik/KVyX5/Aju4ijaZj4tdu9ivC937BHPW8OHghzbr2AJgeOx9KjLe', 5, NULL, '2026-08-23T14:51:02.611Z'),
(28, 'captcha-success@mail.com', '$2b$10$rLMChMz3qMAdz1SAO76EfeaUZhtXLzh2./c66tMS0QGn7MRTmSfia', 5, NULL, '2026-09-03T07:04:55.100Z'),
(1, 'superadmin@mall.com', '$2b$10$ijBcr.0C7rni4XbOJSn4S.kIh/U46EaOf6jPMqiaIlqp7dK6D37qa', 1, NULL, '2026-08-23T14:49:14.274Z');

TRUNCATE TABLE "floors" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "floors" ("floorid" SERIAL PRIMARY KEY, "floorname" TEXT NOT NULL UNIQUE, "floorcode" TEXT, "createdAt" TIMESTAMPTZ);
INSERT INTO "floors" ("floorid", "floorname", "floorcode", "createdAt") VALUES
(1, 'Ground Floor', 'GF', '2026-08-24T05:42:21.123Z'),
(2, 'Lantai 1', 'L1', '2026-08-24T05:42:21.128Z'),
(3, 'Lantai 2', 'L2', '2026-08-24T05:42:21.137Z'),
(4, 'Lantai 3', 'L3', '2026-08-24T05:42:21.139Z');

TRUNCATE TABLE "tenants" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "tenants" ("tenantid" SERIAL PRIMARY KEY, "unit" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "category" TEXT, "logoUrl" TEXT, "mallFee" INTEGER, "leaseUntil" TIMESTAMPTZ, "floorid" INTEGER, "mapX" DOUBLE PRECISION, "mapY" DOUBLE PRECISION, "mapW" DOUBLE PRECISION, "mapH" DOUBLE PRECISION, "createdAt" TIMESTAMPTZ);
INSERT INTO "tenants" ("tenantid", "unit", "name", "category", "logoUrl", "mallFee", "leaseUntil", "floorid", "mapX", "mapY", "mapW", "mapH", "createdAt") VALUES
(2, 'GF-12', 'Uniqlo', 'Fashion', NULL, 120000000, '2027-12-31T00:00:00.000Z', 1, NULL, NULL, NULL, NULL, '2026-08-24T05:42:21.172Z'),
(5, 'L2-08', 'IKEA Pick-up Point', 'Furniture', NULL, 80000000, '2029-04-01T00:00:00.000Z', 3, NULL, NULL, NULL, NULL, '2026-08-24T05:42:21.191Z'),
(6, 'L3-01', 'Food Court Nusantara', 'F&B', NULL, 60000000, '2027-06-30T00:00:00.000Z', 4, NULL, NULL, NULL, NULL, '2026-08-24T05:42:21.197Z'),
(8, 'A-02', 'Unit A-02 Kosong', 'F&B', NULL, 35000000, NULL, 1, NULL, NULL, NULL, NULL, '2026-09-01T03:02:47.499Z'),
(9, 'B-11', 'Unit B-11 Kosong', 'Beauty', NULL, 50000000, NULL, 3, NULL, NULL, NULL, NULL, '2026-09-01T03:02:47.526Z'),
(10, 'C-05', 'Unit C-05 Kosong', 'Electronics', NULL, 60000000, NULL, 4, NULL, NULL, NULL, NULL, '2026-09-01T03:02:47.553Z'),
(3, 'L1-02', 'Zara', 'Fashion', NULL, 95000000, '2028-01-15T00:00:00.000Z', 2, 0, 2021, NULL, NULL, '2026-08-24T05:42:21.178Z'),
(4, 'L2-05', 'Cinema XXI', 'Entertainment', NULL, 150000000, '2030-10-20T00:00:00.000Z', 3, 3072, 3814, NULL, NULL, '2026-08-24T05:42:21.185Z'),
(7, 'A-01', 'Unit A-01 Kosong', 'Fashion', NULL, 45000000, NULL, 2, 2275, 2444, NULL, NULL, '2026-09-01T03:02:47.467Z'),
(1, 'GF-10', 'Starbucks Coffee', 'F&B', NULL, 45000000, '2028-12-12T00:00:00.000Z', 1, 2234, 2490, 80, 60, '2026-08-24T05:42:21.163Z');

TRUNCATE TABLE "floor_areas" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "floor_areas" ("id" SERIAL PRIMARY KEY, "floorid" INTEGER NOT NULL, "code" TEXT NOT NULL, "name" TEXT, "x" DOUBLE PRECISION NOT NULL, "y" DOUBLE PRECISION NOT NULL, "w" DOUBLE PRECISION NOT NULL, "h" DOUBLE PRECISION NOT NULL, "createdAt" TIMESTAMPTZ, "updatedAt" TIMESTAMPTZ);
INSERT INTO "floor_areas" ("id", "floorid", "code", "name", "x", "y", "w", "h", "createdAt", "updatedAt") VALUES
(1, 1, 'A-01', 'Fashion Corner', 1200, 800, 120, 80, '2026-09-01T02:54:36.414Z', '2026-09-01T02:54:36.414Z'),
(2, 1, 'A-02', 'Second', 1400, 800, 120, 80, '2026-09-01T02:54:45.048Z', '2026-09-01T02:54:45.048Z');

TRUNCATE TABLE "events" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "events" ("eventid" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "location" TEXT NOT NULL, "startDate" TIMESTAMPTZ, "endDate" TIMESTAMPTZ, "status" TEXT DEFAULT 'Pending', "createdAt" TIMESTAMPTZ);
INSERT INTO "events" ("eventid", "name", "location", "startDate", "endDate", "status", "createdAt") VALUES
(1, 'Midnight Sale Ritel', 'Atrium Utama', '2026-08-28T00:00:00.000Z', '2026-08-30T00:00:00.000Z', 'Approved', '2026-08-24T05:42:21.145Z'),
(2, 'Pameran Otomotif Monokrom', 'Atrium Utara', '2026-09-02T00:00:00.000Z', '2026-09-08T00:00:00.000Z', 'Approved', '2026-08-24T05:42:21.150Z'),
(3, 'Live Acoustic Music', 'Lantai 2 Terrace', '2026-08-29T00:00:00.000Z', '2026-08-29T00:00:00.000Z', 'Approved', '2026-08-24T05:42:21.154Z'),
(4, 'Festival Kuliner Nusantara', 'Outdoor Parking B', '2026-09-15T00:00:00.000Z', '2026-09-22T00:00:00.000Z', 'Pending', '2026-08-24T05:42:21.158Z');

TRUNCATE TABLE "parking_tickets" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "parking_tickets" ("ticketid" SERIAL PRIMARY KEY, "plate" TEXT NOT NULL, "type" TEXT NOT NULL, "entryAt" TIMESTAMPTZ, "exitAt" TIMESTAMPTZ, "fee" INTEGER, "entryBy" INTEGER, "exitBy" INTEGER, "createdAt" TIMESTAMPTZ);
INSERT INTO "parking_tickets" ("ticketid", "plate", "type", "entryAt", "exitAt", "fee", "entryBy", "exitBy", "createdAt") VALUES
(1, 'B 1234 XYZ', 'Roda 4', '2026-08-24T06:01:17.325Z', NULL, NULL, NULL, NULL, '2026-08-24T06:53:17.326Z'),
(2, 'D 5678 ABC', 'Roda 2', '2026-08-24T03:46:17.325Z', NULL, NULL, NULL, NULL, '2026-08-24T06:53:17.333Z'),
(3, 'B 9012 DEF', 'Roda 2', '2026-08-24T06:46:17.325Z', NULL, NULL, NULL, NULL, '2026-08-24T06:53:17.336Z'),
(4, 'L 4455 GH', 'Roda 4', '2026-08-24T04:33:17.325Z', NULL, NULL, NULL, NULL, '2026-08-24T06:53:17.339Z'),
(5, 'B 7777 QQ', 'Roda 4', '2026-08-24T01:33:17.325Z', '2026-08-24T05:53:17.325Z', 9000, NULL, NULL, '2026-08-24T06:53:17.342Z'),
(6, 'D 2233 KK', 'Roda 2', '2026-08-24T02:33:17.325Z', '2026-08-24T06:08:17.325Z', 3000, NULL, NULL, '2026-08-24T06:53:17.345Z'),
(7, 'F 8899 JJ', 'Roda 4', '2026-08-23T20:53:17.325Z', '2026-08-24T01:53:17.325Z', 11000, NULL, NULL, '2026-08-24T06:53:17.348Z'),
(9, 'B 1234 XYZ', 'Roda 4', '2026-08-24T06:16:56.239Z', NULL, NULL, NULL, NULL, '2026-08-24T07:08:56.240Z'),
(10, 'D 5678 ABC', 'Roda 2', '2026-08-24T04:01:56.239Z', NULL, NULL, NULL, NULL, '2026-08-24T07:08:56.246Z'),
(12, 'L 4455 GH', 'Roda 4', '2026-08-24T04:48:56.239Z', NULL, NULL, NULL, NULL, '2026-08-24T07:08:56.253Z'),
(13, 'B 7777 QQ', 'Roda 4', '2026-08-24T01:48:56.239Z', '2026-08-24T06:08:56.239Z', 9000, NULL, NULL, '2026-08-24T07:08:56.257Z'),
(14, 'D 2233 KK', 'Roda 2', '2026-08-24T02:48:56.239Z', '2026-08-24T06:23:56.239Z', 3000, NULL, NULL, '2026-08-24T07:08:56.260Z'),
(15, 'F 8899 JJ', 'Roda 4', '2026-08-23T21:08:56.239Z', '2026-08-24T02:08:56.239Z', 11000, NULL, NULL, '2026-08-24T07:08:56.264Z'),
(11, 'B 9012 DEF', 'Roda 2', '2026-08-24T07:01:56.239Z', '2026-09-03T06:18:51.534Z', 480000, NULL, 4, '2026-08-24T07:08:56.249Z');

TRUNCATE TABLE "settings" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "settings" ("id" SERIAL PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "value" TEXT, "updatedAt" TIMESTAMPTZ);
INSERT INTO "settings" ("id", "key", "value", "updatedAt") VALUES
(6, 'app_favicon', '/uploads/img-1787557901721-979688071.png', '2026-08-24T07:51:41.792Z'),
(1, 'app_name', 'Cherishe', '2026-09-04T08:52:30.134Z'),
(2, 'email', 'admin@mall.com', '2026-09-04T08:52:30.166Z'),
(3, 'phone', '+62 21 555 0123', '2026-09-04T08:52:30.171Z'),
(4, 'address', 'Jl. Boulevard Raya No. 45', '2026-09-04T08:52:30.177Z'),
(9, 'brand_mode', 'name', '2026-09-04T08:52:30.180Z'),
(5, 'app_logo', '/uploads/img-1788511950110-202277543.png', '2026-09-04T08:52:30.183Z');

TRUNCATE TABLE "locations" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "locations" ("id" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "category" TEXT, "description" TEXT, "roomNumber" TEXT, "floor" TEXT DEFAULT 'Ground Floor', "x" DOUBLE PRECISION, "y" DOUBLE PRECISION, "createdAt" TIMESTAMPTZ, "updatedAt" TIMESTAMPTZ);
INSERT INTO "locations" ("id", "name", "category", "description", "roomNumber", "floor", "x", "y", "createdAt", "updatedAt") VALUES
(2, 'Lab Komputer 1', 'Laboratory', 'Lab komputer lantai dasar', 'GK-101', 'Ground Floor', 1850, 2250, '2026-09-01T02:44:22.876Z', '2026-09-01T02:44:32.076Z');

TRUNCATE TABLE "tenant_requests" RESTART IDENTITY CASCADE;
CREATE TABLE IF NOT EXISTS "tenant_requests" ("id" SERIAL PRIMARY KEY, "userid" INTEGER NOT NULL, "tenantid" INTEGER NOT NULL, "durationMonths" INTEGER NOT NULL, "totalFee" INTEGER NOT NULL, "paymentMethod" TEXT, "businessName" TEXT NOT NULL, "businessCategory" TEXT, "description" TEXT, "phone" TEXT, "status" TEXT DEFAULT 'Pending', "contractStart" TIMESTAMPTZ, "createdAt" TIMESTAMPTZ, "updatedAt" TIMESTAMPTZ);

COMMIT;
