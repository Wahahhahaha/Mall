--
-- PostgreSQL database dump
--

\restrict TBNwsSph5o6OcLBhwHkkRsM5A7md5JVm2u1YMIlLfZignuhkHZC7UTqjLRs5kfV

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    datetime timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip text,
    latitude double precision,
    longitude double precision,
    userid integer,
    email text,
    role text,
    action text NOT NULL
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    eventid integer NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    floorid integer,
    posters text[] DEFAULT ARRAY[]::text[]
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: events_eventid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_eventid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_eventid_seq OWNER TO postgres;

--
-- Name: events_eventid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_eventid_seq OWNED BY public.events.eventid;


--
-- Name: floors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.floors (
    floorid integer NOT NULL,
    floorname text NOT NULL,
    floorcode text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.floors OWNER TO postgres;

--
-- Name: floors_floorid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.floors_floorid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.floors_floorid_seq OWNER TO postgres;

--
-- Name: floors_floorid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.floors_floorid_seq OWNED BY public.floors.floorid;


--
-- Name: level; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.level (
    levelid integer NOT NULL,
    levelname text NOT NULL
);


ALTER TABLE public.level OWNER TO postgres;

--
-- Name: level_levelid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.level_levelid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.level_levelid_seq OWNER TO postgres;

--
-- Name: level_levelid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.level_levelid_seq OWNED BY public.level.levelid;


--
-- Name: levelpermission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.levelpermission (
    id integer NOT NULL,
    levelid integer NOT NULL,
    page text NOT NULL,
    action text NOT NULL,
    granted boolean DEFAULT false NOT NULL
);


ALTER TABLE public.levelpermission OWNER TO postgres;

--
-- Name: levelpermission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.levelpermission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.levelpermission_id_seq OWNER TO postgres;

--
-- Name: levelpermission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.levelpermission_id_seq OWNED BY public.levelpermission.id;


--
-- Name: locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locations (
    id integer NOT NULL,
    name text NOT NULL,
    floorid integer,
    x double precision NOT NULL,
    y double precision NOT NULL,
    "pricePerYear" integer DEFAULT 50000000,
    "minLeaseYears" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.locations OWNER TO postgres;

--
-- Name: locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.locations_id_seq OWNER TO postgres;

--
-- Name: locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.locations_id_seq OWNED BY public.locations.id;


--
-- Name: parking_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parking_tickets (
    ticketid integer NOT NULL,
    plate text NOT NULL,
    type text NOT NULL,
    entry_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    exit_at timestamp(3) without time zone,
    fee integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "entryBy" integer,
    "exitBy" integer
);


ALTER TABLE public.parking_tickets OWNER TO postgres;

--
-- Name: parking_tickets_ticketid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parking_tickets_ticketid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parking_tickets_ticketid_seq OWNER TO postgres;

--
-- Name: parking_tickets_ticketid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parking_tickets_ticketid_seq OWNED BY public.parking_tickets.ticketid;


--
-- Name: recycle_bin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recycle_bin (
    id integer NOT NULL,
    "entityType" text NOT NULL,
    "entityId" integer NOT NULL,
    name text NOT NULL,
    data jsonb NOT NULL,
    "deletedBy" text,
    "deletedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip text,
    latitude double precision,
    longitude double precision
);


ALTER TABLE public.recycle_bin OWNER TO postgres;

--
-- Name: recycle_bin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recycle_bin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recycle_bin_id_seq OWNER TO postgres;

--
-- Name: recycle_bin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recycle_bin_id_seq OWNED BY public.recycle_bin.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id integer DEFAULT 1 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "logoMode" boolean DEFAULT false NOT NULL,
    "systemAddress" text,
    "systemContact" text,
    "systemFavicon" text,
    "systemLogo" text,
    "systemName" text DEFAULT 'SIM MALL'::text NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: tenant_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenant_requests (
    id integer NOT NULL,
    userid integer NOT NULL,
    tenantid integer NOT NULL,
    "durationMonths" integer NOT NULL,
    "totalFee" integer NOT NULL,
    "paymentMethod" text NOT NULL,
    "businessName" text NOT NULL,
    "businessCategory" text NOT NULL,
    description text,
    phone text,
    status text DEFAULT 'Pending'::text NOT NULL,
    "contractStart" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tenant_requests OWNER TO postgres;

--
-- Name: tenant_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenant_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenant_requests_id_seq OWNER TO postgres;

--
-- Name: tenant_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenant_requests_id_seq OWNED BY public.tenant_requests.id;


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    tenantid integer NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    "leaseUntil" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "logoUrl" text,
    "mallFee" integer,
    locationid integer,
    "mapH" double precision,
    "mapW" double precision,
    "mapX" double precision,
    "mapY" double precision
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: tenants_tenantid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tenants_tenantid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tenants_tenantid_seq OWNER TO postgres;

--
-- Name: tenants_tenantid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tenants_tenantid_seq OWNED BY public.tenants.tenantid;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    userid integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    levelid integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    phone text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_userid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_userid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_userid_seq OWNER TO postgres;

--
-- Name: users_userid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_userid_seq OWNED BY public.users.userid;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: events eventid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN eventid SET DEFAULT nextval('public.events_eventid_seq'::regclass);


--
-- Name: floors floorid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.floors ALTER COLUMN floorid SET DEFAULT nextval('public.floors_floorid_seq'::regclass);


--
-- Name: level levelid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.level ALTER COLUMN levelid SET DEFAULT nextval('public.level_levelid_seq'::regclass);


--
-- Name: levelpermission id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levelpermission ALTER COLUMN id SET DEFAULT nextval('public.levelpermission_id_seq'::regclass);


--
-- Name: locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations ALTER COLUMN id SET DEFAULT nextval('public.locations_id_seq'::regclass);


--
-- Name: parking_tickets ticketid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parking_tickets ALTER COLUMN ticketid SET DEFAULT nextval('public.parking_tickets_ticketid_seq'::regclass);


--
-- Name: recycle_bin id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recycle_bin ALTER COLUMN id SET DEFAULT nextval('public.recycle_bin_id_seq'::regclass);


--
-- Name: tenant_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_requests ALTER COLUMN id SET DEFAULT nextval('public.tenant_requests_id_seq'::regclass);


--
-- Name: tenants tenantid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants ALTER COLUMN tenantid SET DEFAULT nextval('public.tenants_tenantid_seq'::regclass);


--
-- Name: users userid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN userid SET DEFAULT nextval('public.users_userid_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
4a99d826-fc00-4380-bd17-6c8020cdd59b	e6c346e5f644e2ff6a88a10a383ac0b9967f6343c04e3337cbcae6cb39c87f98	2026-09-28 02:05:46.768274+00	20260823143438_init	\N	\N	2026-09-28 02:05:46.741439+00	1
628ead70-008a-4cc6-94ae-c7e85103b683	f3b2bd53e629b1bee8d28ce7328052ea3c45f6f8c3af417fc13ce6a543b42f08	2026-09-28 02:05:46.815207+00	20260823144732_add_level_and_users	\N	\N	2026-09-28 02:05:46.770707+00	1
6b16d5d1-5ff0-45d7-bbb0-b3c6f5cb21e7	91a0d4b3a0f993c8d89f123c8abe25a85e065de1ea96fb8a8a73ccc09845ac34	2026-09-28 02:05:46.86725+00	20260824054158_add_floor_event_tenant	\N	\N	2026-09-28 02:05:46.817542+00	1
94bd7672-338b-4a64-960b-96980da35f0d	7ec6a17b2b2f889c49ba25a30deee26311890c587ea9da46282e91f6b3426e36	2026-09-28 02:05:46.890913+00	20260824065309_add_parking_tickets	\N	\N	2026-09-28 02:05:46.869621+00	1
313da608-1632-4c00-82a2-ddd49962a0b1	1ebdfb39b04d3eb00ab511773570e46a2590fc3872a4e1ff342421b90cc1205c	2026-09-28 02:05:46.914536+00	20260824070000_tenant_logo_fee_settings_drop_level_desc	\N	\N	2026-09-28 02:05:46.893368+00	1
85c880f9-ed08-40e0-b612-e01a1df5b1be	e945f298425a8c1d450650a50c11cc6d82c07c86f90212cdeaa2aed38fdb1ecd	2026-09-28 02:05:46.924899+00	20260902120000_add_user_phone	\N	\N	2026-09-28 02:05:46.917291+00	1
9e228bc6-bb95-4df7-9067-370bd4d0524c	7225f83032161b2f5b7f3f399dac60a6b25e6a00b72429fc0e7dc14193bb1a30	2026-09-28 02:05:46.934553+00	20260902130000_add_parking_operator	\N	\N	2026-09-28 02:05:46.927031+00	1
30176308-19ae-4bf7-9a43-2618898ee03b	e81049a33ef23b9256ce59854eaf77838bee936d62568877d49d2ba65374030e	2026-09-28 02:05:46.943127+00	20260925000000_add_event_description	\N	\N	2026-09-28 02:05:46.936549+00	1
84910320-ca92-4785-a27b-92bb1c736652	52935d54aa5565b741b1ca12cf5d4ebbdc55906b875bce2f2aac80f5a7914fae	2026-09-28 02:05:46.953058+00	20260926000000_drop_event_status	\N	\N	2026-09-28 02:05:46.945427+00	1
d28654c4-b02f-4f94-a9b7-06f6b199191e	7a38423f982c03785148981563af7370d87ecd341a9b81e78381b0551fe7a822	\N	20260926010000_add_activity_log_role	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260926010000_add_activity_log_role\n\nDatabase error code: 42P01\n\nDatabase error:\nERROR: relation "activity_logs" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P01), message: "relation \\"activity_logs\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("namespace.c"), line: Some(434), routine: Some("RangeVarGetRelidExtended") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260926010000_add_activity_log_role"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260926010000_add_activity_log_role"\n             at schema-engine/commands/src/commands/apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:260	\N	2026-09-28 02:05:46.955313+00	0
\.


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, datetime, ip, latitude, longitude, userid, email, role, action) FROM stdin;
1	2026-09-28 02:20:12.188	127.0.0.1	-6.2088	106.8456	6	demo@mall.com	Tenant	LOGIN — Demo user successfully logged in
2	2026-09-28 02:57:23.215	182.253.9.66	1.136323825336832	104.0256547515363	1	superadmin@mall.com	Superadmin	REORDER floors [2,1,3,4,5]
3	2026-09-28 02:57:24.828	182.253.9.66	1.136323825336832	104.0256547515363	1	superadmin@mall.com	Superadmin	REORDER floors [1,2,3,4,5]
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (eventid, name, location, "startDate", "endDate", "createdAt", description, floorid, posters) FROM stdin;
1	Midnight Sale Ritel	Atrium Utama	2026-08-28 00:00:00	2026-08-30 00:00:00	2026-09-28 02:20:12.071	\N	2	{}
2	Pameran Otomotif Monokrom	Atrium Utara	2026-09-02 00:00:00	2026-09-08 00:00:00	2026-09-28 02:20:12.092	\N	2	{}
3	Live Acoustic Music	Terrace 2F	2026-08-29 00:00:00	2026-08-29 00:00:00	2026-09-28 02:20:12.102	\N	2	{}
4	Festival Kuliner Nusantara	Outdoor Parking B	2026-09-15 00:00:00	2026-09-22 00:00:00	2026-09-28 02:20:12.111	\N	2	{}
\.


--
-- Data for Name: floors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.floors (floorid, floorname, floorcode, "createdAt", "sortOrder") FROM stdin;
1	Lower Ground	LG	2026-09-28 02:20:11.95	0
2	Ground Floor	GF	2026-09-28 02:20:11.956	1
3	1 Floor	1F	2026-09-28 02:20:11.969	2
4	2 Floor	2F	2026-09-28 02:20:11.974	3
5	3 Floor	3F	2026-09-28 02:20:11.98	4
\.


--
-- Data for Name: level; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.level (levelid, levelname) FROM stdin;
1	Superadmin
2	Admin
3	Parkir
4	Manager
5	Tenant
\.


--
-- Data for Name: levelpermission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.levelpermission (id, levelid, page, action, granted) FROM stdin;
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.locations (id, name, floorid, x, y, "pricePerYear", "minLeaseYears", "createdAt", "updatedAt") FROM stdin;
1	A-01	2	12.5	35	60000000	1	2026-09-28 02:20:11.994	2026-09-28 02:20:11.994
2	A-02	2	25	35	55000000	1	2026-09-28 02:20:12.006	2026-09-28 02:20:12.006
3	LG-01	1	10	20	40000000	1	2026-09-28 02:20:12.018	2026-09-28 02:20:12.018
4	GF-10	2	30	40	75000000	1	2026-09-28 02:20:12.029	2026-09-28 02:20:12.029
5	GF-12	2	50	40	120000000	1	2026-09-28 02:20:12.037	2026-09-28 02:20:12.037
6	1F-02	3	15	25	95000000	1	2026-09-28 02:20:12.044	2026-09-28 02:20:12.044
7	2F-05	4	20	30	150000000	1	2026-09-28 02:20:12.052	2026-09-28 02:20:12.052
8	3F-01	5	40	50	60000000	1	2026-09-28 02:20:12.058	2026-09-28 02:20:12.058
\.


--
-- Data for Name: parking_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parking_tickets (ticketid, plate, type, entry_at, exit_at, fee, "createdAt", "entryBy", "exitBy") FROM stdin;
1	B 1234 XYZ	Roda 4	2026-09-28 01:28:12.195	\N	\N	2026-09-28 02:20:12.198	\N	\N
2	D 5678 ABC	Roda 2	2026-09-27 23:13:12.195	\N	\N	2026-09-28 02:20:12.205	\N	\N
3	B 9012 DEF	Roda 2	2026-09-28 02:13:12.195	\N	\N	2026-09-28 02:20:12.209	\N	\N
4	L 4455 GH	Roda 4	2026-09-28 00:00:12.195	\N	\N	2026-09-28 02:20:12.214	\N	\N
5	B 7777 QQ	Roda 4	2026-09-27 21:00:12.195	2026-09-28 01:20:12.195	9000	2026-09-28 02:20:12.222	\N	\N
\.


--
-- Data for Name: recycle_bin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recycle_bin (id, "entityType", "entityId", name, data, "deletedBy", "deletedAt", ip, latitude, longitude) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (id, "updatedAt", "logoMode", "systemAddress", "systemContact", "systemFavicon", "systemLogo", "systemName") FROM stdin;
1	2026-09-28 02:20:12.227	f	Jl. Boulevard Raya No. 45	+62 21 555 0123 | admin@mall.com	\N	\N	SIM MALL
\.


--
-- Data for Name: tenant_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenant_requests (id, userid, tenantid, "durationMonths", "totalFee", "paymentMethod", "businessName", "businessCategory", description, phone, status, "contractStart", "createdAt", "updatedAt") FROM stdin;
1	6	1	12	60000000	Bank Transfer	Kopi Kenangan Demo	F&B	Pengajuan sewa gerai F&B durasi 12 bulan (1 tahun)	+62 812 3456 7890	Pending	2026-10-01 00:00:00	2026-09-28 02:20:12.173	2026-09-28 02:20:12.173
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tenants (tenantid, name, category, "leaseUntil", "createdAt", "logoUrl", "mallFee", locationid, "mapH", "mapW", "mapX", "mapY") FROM stdin;
1	Starbucks Coffee	F&B	2028-12-12 00:00:00	2026-09-28 02:20:12.118	\N	45000000	4	\N	\N	\N	\N
2	Uniqlo	Fashion	2027-12-31 00:00:00	2026-09-28 02:20:12.129	\N	120000000	5	\N	\N	\N	\N
3	Zara	Fashion	2028-01-15 00:00:00	2026-09-28 02:20:12.139	\N	95000000	6	\N	\N	\N	\N
4	Cinema XXI	Entertainment	2030-10-20 00:00:00	2026-09-28 02:20:12.148	\N	150000000	7	\N	\N	\N	\N
5	Food Court Nusantara	F&B	2027-06-30 00:00:00	2026-09-28 02:20:12.156	\N	60000000	8	\N	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (userid, email, password, levelid, "createdAt", phone) FROM stdin;
1	superadmin@mall.com	$2b$10$erAL/fhXlcDQ3nKbuJdNA.ngSumSmjqkLxDGIHJIlJEcpeCKm4sj.	1	2026-09-28 02:20:11.082	\N
2	admin@mall.com	$2b$10$9Zim8wOFJc5fNg/zMQSPxu/ZkKOdcRXml2R1AVU325ZICskuIg.IW	2	2026-09-28 02:20:11.223	\N
3	parkir@mall.com	$2b$10$0uBvsdA.J/DYRBaTMdBZhuk8sQwoYUZnD0iHVKs0LdooLde.jTpiu	3	2026-09-28 02:20:11.367	\N
4	manager@mall.com	$2b$10$g1MeWRdxT2/M89FqJGH4/OPrKqaIO3TIgGuGSkSawkYrdmyZZOoLG	4	2026-09-28 02:20:11.509	\N
5	tenant@mall.com	$2b$10$ezxN72hX5hvRa3y2pyCZzuzNTSfg3qRizOQy/3PUTR3K2jdaXoAO6	5	2026-09-28 02:20:11.65	\N
6	demo@mall.com	$2b$10$JYwh8eBVghdY3wqx5yECz.bFuxJc3kvGuB3XqpeA2ygbfn1Ysattq	5	2026-09-28 02:20:11.796	\N
7	demouser@mall.com	$2b$10$BSteoC3CPNfsKDa9ZKT39.R10vt8ExdBw95e/YvG78AMLid0mG1ge	5	2026-09-28 02:20:11.945	\N
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 3, true);


--
-- Name: events_eventid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.events_eventid_seq', 4, true);


--
-- Name: floors_floorid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.floors_floorid_seq', 5, true);


--
-- Name: level_levelid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.level_levelid_seq', 5, true);


--
-- Name: levelpermission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.levelpermission_id_seq', 1, false);


--
-- Name: locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.locations_id_seq', 8, true);


--
-- Name: parking_tickets_ticketid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parking_tickets_ticketid_seq', 5, true);


--
-- Name: recycle_bin_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recycle_bin_id_seq', 1, false);


--
-- Name: tenant_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tenant_requests_id_seq', 1, true);


--
-- Name: tenants_tenantid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tenants_tenantid_seq', 5, true);


--
-- Name: users_userid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_userid_seq', 7, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (eventid);


--
-- Name: floors floors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.floors
    ADD CONSTRAINT floors_pkey PRIMARY KEY (floorid);


--
-- Name: level level_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.level
    ADD CONSTRAINT level_pkey PRIMARY KEY (levelid);


--
-- Name: levelpermission levelpermission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levelpermission
    ADD CONSTRAINT levelpermission_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: parking_tickets parking_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parking_tickets
    ADD CONSTRAINT parking_tickets_pkey PRIMARY KEY (ticketid);


--
-- Name: recycle_bin recycle_bin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recycle_bin
    ADD CONSTRAINT recycle_bin_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: tenant_requests tenant_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_requests
    ADD CONSTRAINT tenant_requests_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (tenantid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (userid);


--
-- Name: activity_logs_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activity_logs_email_idx ON public.activity_logs USING btree (email);


--
-- Name: activity_logs_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activity_logs_role_idx ON public.activity_logs USING btree (role);


--
-- Name: activity_logs_userid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activity_logs_userid_idx ON public.activity_logs USING btree (userid);


--
-- Name: events_floorid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX events_floorid_idx ON public.events USING btree (floorid);


--
-- Name: floors_floorcode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX floors_floorcode_key ON public.floors USING btree (floorcode);


--
-- Name: floors_floorname_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX floors_floorname_key ON public.floors USING btree (floorname);


--
-- Name: level_levelname_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX level_levelname_key ON public.level USING btree (levelname);


--
-- Name: levelpermission_levelid_page_action_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX levelpermission_levelid_page_action_key ON public.levelpermission USING btree (levelid, page, action);


--
-- Name: locations_floorid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX locations_floorid_idx ON public.locations USING btree (floorid);


--
-- Name: parking_tickets_plate_exit_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX parking_tickets_plate_exit_at_idx ON public.parking_tickets USING btree (plate, exit_at);


--
-- Name: tenant_requests_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tenant_requests_status_idx ON public.tenant_requests USING btree (status);


--
-- Name: tenant_requests_tenantid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tenant_requests_tenantid_idx ON public.tenant_requests USING btree (tenantid);


--
-- Name: tenant_requests_userid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tenant_requests_userid_idx ON public.tenant_requests USING btree (userid);


--
-- Name: tenants_locationid_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX tenants_locationid_key ON public.tenants USING btree (locationid);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: activity_logs activity_logs_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(userid) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: events events_floorid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_floorid_fkey FOREIGN KEY (floorid) REFERENCES public.floors(floorid) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: levelpermission levelpermission_levelid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.levelpermission
    ADD CONSTRAINT levelpermission_levelid_fkey FOREIGN KEY (levelid) REFERENCES public.level(levelid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: locations locations_floorid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_floorid_fkey FOREIGN KEY (floorid) REFERENCES public.floors(floorid) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tenant_requests tenant_requests_tenantid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_requests
    ADD CONSTRAINT tenant_requests_tenantid_fkey FOREIGN KEY (tenantid) REFERENCES public.tenants(tenantid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_requests tenant_requests_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenant_requests
    ADD CONSTRAINT tenant_requests_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(userid) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenants tenants_locationid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_locationid_fkey FOREIGN KEY (locationid) REFERENCES public.locations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_levelid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_levelid_fkey FOREIGN KEY (levelid) REFERENCES public.level(levelid) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict TBNwsSph5o6OcLBhwHkkRsM5A7md5JVm2u1YMIlLfZignuhkHZC7UTqjLRs5kfV

