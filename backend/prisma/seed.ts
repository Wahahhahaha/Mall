import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed levels
  const levels = [
    { levelname: 'Superadmin', description: 'Akses penuh sistem, konfigurasi, backup data, & logs' },
    { levelname: 'Admin', description: 'Mengelola data tenant, tagihan, dan penjadwalan event' },
    { levelname: 'Parkir', description: 'Mencatat tapping kendaraan masuk & keluar pos parkir' },
    { levelname: 'Manager', description: 'Melihat laporan pendapatan, analitik pengunjung & audit' },
    { levelname: 'Tenant', description: 'Melaporkan omset harian & keluhan teknis gerai' },
  ];

  console.log('Seeding levels...');
  for (const lvl of levels) {
    await prisma.level.upsert({
      where: { levelname: lvl.levelname },
      update: {},
      create: { levelname: lvl.levelname },
    });
  }

  const getLevelId = async (name: string) => {
    const lvl = await prisma.level.findUnique({ where: { levelname: name } });
    if (!lvl) throw new Error(`Level ${name} not found`);
    return lvl.levelid;
  };

  // 1b. Seed the permission matrix. Views are on by default for every level;
  // write-level actions are granted only to Superadmin and Admin.
  const permissionPages = [
    { page: 'dashboard', actions: ['view'] },
    { page: 'parkir', actions: ['view', 'checkin', 'checkout', 'logs'] },
    { page: 'map', actions: ['view', 'manage'] },
    { page: 'event-data', actions: ['view', 'create', 'edit', 'delete'] },
    { page: 'floor-data', actions: ['view', 'create', 'edit', 'delete'] },
    { page: 'tenant-data', actions: ['view', 'create', 'edit', 'delete'] },
    { page: 'lease-requests', actions: ['view', 'approve', 'reject'] },
    { page: 'user-data', actions: ['view', 'create', 'edit', 'delete', 'reset'] },
    { page: 'activity-log', actions: ['view'] },
    { page: 'backup', actions: ['view', 'create', 'download', 'delete'] },
    { page: 'trash', actions: ['view', 'restore', 'delete'] },
    { page: 'permission', actions: ['view', 'manage'] },
    { page: 'setting', actions: ['view', 'edit'] },
    { page: 'report', actions: ['view'] },
    { page: 'profile', actions: ['view'] },
  ];

  console.log('Seeding permissions...');
  const levelsToSeed = await Promise.all(
    levels.map(async (lvl) => ({
      levelid: await getLevelId(lvl.levelname),
      levelname: lvl.levelname,
    })),
  );
  for (const { levelid, levelname } of levelsToSeed) {
    const privileged = levelname === 'Superadmin' || levelname === 'Admin';
    for (const { page, actions } of permissionPages) {
      for (const action of actions) {
        await prisma.levelPermission.upsert({
          where: { levelid_page_action: { levelid, page, action } },
          update: { granted: action === 'view' || privileged },
          create: { levelid, page, action, granted: action === 'view' || privileged },
        });
      }
    }
  }

  // 2. Seed demo & system users
  const usersToSeed = [
    { email: 'superadmin@mall.com', password: 'superadmin', role: 'Superadmin' },
    { email: 'admin@mall.com', password: 'admin', role: 'Admin' },
    { email: 'parkir@mall.com', password: 'parkir', role: 'Parkir' },
    { email: 'manager@mall.com', password: 'manager', role: 'Manager' },
    { email: 'tenant@mall.com', password: 'tenant', role: 'Tenant' },
    { email: 'demo@mall.com', password: 'demo123', role: 'Tenant' },
    { email: 'demouser@mall.com', password: 'demouser123', role: 'Tenant' },
  ];

  console.log('Seeding users (including demo users)...');
  for (const u of usersToSeed) {
    const levelid = await getLevelId(u.role);
    const hashedPassword = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword,
        levelid: levelid,
      },
      create: {
        email: u.email,
        password: hashedPassword,
        levelid: levelid,
      },
    });
  }

  // 3. Seed floors (Lower Ground, Ground Floor, 1 Floor, 2 Floor, 3 Floor)
  console.log('Seeding floors...');
  const floors = [
    { floorname: 'Lower Ground', floorcode: 'LG', sortOrder: 0 },
    { floorname: 'Ground Floor', floorcode: 'GF', sortOrder: 1 },
    { floorname: '1 Floor', floorcode: '1F', sortOrder: 2 },
    { floorname: '2 Floor', floorcode: '2F', sortOrder: 3 },
    { floorname: '3 Floor', floorcode: '3F', sortOrder: 4 },
  ];
  for (const f of floors) {
    await prisma.floor.upsert({
      where: { floorname: f.floorname },
      update: { floorcode: f.floorcode, sortOrder: f.sortOrder },
      create: f,
    });
  }

  const getFloorId = async (name: string) => {
    const f = await prisma.floor.findUnique({ where: { floorname: name } });
    if (f) return f.floorid;
    // Fallback search for aliases
    const fallbackMap: Record<string, string> = {
      'Lantai 1': '1 Floor',
      'Lantai 2': '2 Floor',
      'Lantai 3': '3 Floor',
    };
    const mappedName = fallbackMap[name] ?? name;
    const f2 = await prisma.floor.findUnique({ where: { floorname: mappedName } });
    if (!f2) throw new Error(`Floor ${name} not found`);
    return f2.floorid;
  };

  // 4. Seed locations with unit name (e.g. A-01), x, y, pricePerYear, minLeaseYears: 1
  console.log('Seeding locations...');
  const locationsSeed = [
    { name: 'A-01', floor: 'Ground Floor', x: 12.5, y: 35.0, pricePerYear: 60000000, minLeaseYears: 1 },
    { name: 'A-02', floor: 'Ground Floor', x: 25.0, y: 35.0, pricePerYear: 55000000, minLeaseYears: 1 },
    { name: 'LG-01', floor: 'Lower Ground', x: 10.0, y: 20.0, pricePerYear: 40000000, minLeaseYears: 1 },
    { name: 'GF-10', floor: 'Ground Floor', x: 30.0, y: 40.0, pricePerYear: 75000000, minLeaseYears: 1 },
    { name: 'GF-12', floor: 'Ground Floor', x: 50.0, y: 40.0, pricePerYear: 120000000, minLeaseYears: 1 },
    { name: '1F-02', floor: '1 Floor', x: 15.0, y: 25.0, pricePerYear: 95000000, minLeaseYears: 1 },
    { name: '2F-05', floor: '2 Floor', x: 20.0, y: 30.0, pricePerYear: 150000000, minLeaseYears: 1 },
    { name: '3F-01', floor: '3 Floor', x: 40.0, y: 50.0, pricePerYear: 60000000, minLeaseYears: 1 },
  ];

  for (const loc of locationsSeed) {
    const floorid = await getFloorId(loc.floor);
    const existing = await prisma.location.findFirst({ where: { name: loc.name } });
    if (existing) {
      await prisma.location.update({
        where: { id: existing.id },
        data: {
          floorid,
          x: loc.x,
          y: loc.y,
          pricePerYear: loc.pricePerYear,
          minLeaseYears: loc.minLeaseYears,
        },
      });
    } else {
      await prisma.location.create({
        data: {
          name: loc.name,
          floorid,
          x: loc.x,
          y: loc.y,
          pricePerYear: loc.pricePerYear,
          minLeaseYears: loc.minLeaseYears,
        },
      });
    }
  }

  // 5. Seed events
  console.log('Seeding events...');
  const events = [
    { name: 'Midnight Sale Ritel', location: 'Atrium Utama', startDate: new Date('2026-08-28'), endDate: new Date('2026-08-30') },
    { name: 'Pameran Otomotif Monokrom', location: 'Atrium Utara', startDate: new Date('2026-09-02'), endDate: new Date('2026-09-08') },
    { name: 'Live Acoustic Music', location: 'Terrace 2F', startDate: new Date('2026-08-29'), endDate: new Date('2026-08-29') },
    { name: 'Festival Kuliner Nusantara', location: 'Outdoor Parking B', startDate: new Date('2026-09-15'), endDate: new Date('2026-09-22') },
  ];
  for (const ev of events) {
    const existing = await prisma.event.findFirst({ where: { name: ev.name } });
    if (!existing) {
      const gfId = await getFloorId('Ground Floor');
      await prisma.event.create({ data: { ...ev, floorid: gfId } });
    }
  }

  // 6. Seed tenants
  console.log('Seeding tenants...');
  // Unit prices live in locations.pricePerYear; tenants only reference the unit.
  const tenants = [
    { unit: 'GF-10', name: 'Starbucks Coffee', category: 'F&B', leaseUntil: new Date('2028-12-12') },
    { unit: 'GF-12', name: 'Uniqlo', category: 'Fashion', leaseUntil: new Date('2027-12-31') },
    { unit: '1F-02', name: 'Zara', category: 'Fashion', leaseUntil: new Date('2028-01-15') },
    { unit: '2F-05', name: 'Cinema XXI', category: 'Entertainment', leaseUntil: new Date('2030-10-20') },
    { unit: '3F-01', name: 'Food Court Nusantara', category: 'F&B', leaseUntil: new Date('2027-06-30') },
  ];
  for (const t of tenants) {
    const location = await prisma.location.findFirst({ where: { name: t.unit } });
    if (location) {
      await prisma.tenant.upsert({
        where: { locationid: location.id },
        update: { name: t.name, category: t.category, leaseUntil: t.leaseUntil },
        create: {
          name: t.name,
          category: t.category,
          leaseUntil: t.leaseUntil,
          locationid: location.id,
        },
      });
    }
  }

  // 7. Seed tenant requests (Permintaan sewa)
  console.log('Seeding tenant requests...');
  const demoUser = await prisma.user.findUnique({ where: { email: 'demo@mall.com' } });
  const vacantLocation = await prisma.location.findFirst({
    where: {
      isDeleted: false,
      tenants: { none: { isDeleted: false, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] } },
    },
    orderBy: { id: 'asc' },
  });
  if (demoUser && vacantLocation) {
    const existingReq = await prisma.tenantRequest.findFirst({
      where: { userid: demoUser.userid, isDeleted: false },
    });
    if (!existingReq) {
      const monthlyFee = Math.round((vacantLocation.pricePerYear ?? 0) / 12);
      await prisma.tenantRequest.create({
        data: {
          userid: demoUser.userid,
          locationid: vacantLocation.id,
          durationMonths: 12,
          totalFee: Math.round(monthlyFee * 12 * 0.9),
          paymentMethod: 'Bank Transfer',
          businessName: 'Kopi Kenangan Demo',
          businessCategory: 'F&B',
          description: 'Pengajuan sewa gerai F&B durasi 12 bulan (1 tahun)',
          phone: '+62 812 3456 7890',
          status: 'Pending',
          contractStart: new Date('2026-10-01'),
        },
      });
    }
  }

  // 8. Seed activity logs
  console.log('Seeding activity logs...');
  const existingLog = await prisma.activityLog.findFirst();
  if (!existingLog && demoUser) {
    await prisma.activityLog.create({
      data: {
        datetime: new Date(),
        ip: '127.0.0.1',
        latitude: -6.2088,
        longitude: 106.8456,
        userid: demoUser.userid,
        email: demoUser.email,
        action: 'LOGIN — Demo user successfully logged in',
      },
    });
  }

  // 9. Seed parking tickets
  console.log('Seeding parking tickets...');
  const nowMs = Date.now();
  const parkingSeed = [
    { plate: 'B 1234 XYZ', type: 'Roda 4', minutesAgo: 52, exitMinutesAgo: null, fee: null },
    { plate: 'D 5678 ABC', type: 'Roda 2', minutesAgo: 187, exitMinutesAgo: null, fee: null },
    { plate: 'B 9012 DEF', type: 'Roda 2', minutesAgo: 7, exitMinutesAgo: null, fee: null },
    { plate: 'L 4455 GH', type: 'Roda 4', minutesAgo: 140, exitMinutesAgo: null, fee: null },
    { plate: 'B 7777 QQ', type: 'Roda 4', minutesAgo: 320, exitMinutesAgo: 60, fee: 9000 },
  ];
  for (const t of parkingSeed) {
    const entryAt = new Date(nowMs - t.minutesAgo * 60000);
    const exitAt = t.exitMinutesAgo === null ? null : new Date(nowMs - t.exitMinutesAgo * 60000);
    await prisma.parkingTicket.create({ data: { plate: t.plate, type: t.type, entryAt, exitAt, fee: t.fee } });
  }

  // 10. Seed settings
  console.log('Seeding settings...');
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      systemName: 'SIM MALL',
      systemContact: '+62 21 555 0123 | admin@mall.com',
      systemAddress: 'Jl. Boulevard Raya No. 45',
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
