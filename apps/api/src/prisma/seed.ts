import { HostVerificationStatus, PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding Dhyana Stays database…');

  // ── 1. Admin user ──────────────────────────────────────────────────────────
  const legacyAdminEmail = 'admin@dhyanastays.local';
  const adminEmail = 'admin@dhyanastays.com';
  const adminPassword = 'Password@123!';

  // Disable legacy local admin account so old credentials stop working.
  await prisma.user.updateMany({
    where: { email: legacyAdminEmail, role: UserRole.ADMIN },
    data: { isActive: false },
  });

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const adminPasswordHash = await argon2.hash(adminPassword);

  if (!admin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: 'Dhyana Admin',
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
    // eslint-disable-next-line no-console
    console.log('  ✓ Admin user created:', adminEmail);
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        passwordHash: adminPasswordHash,
        isActive: true,
        role: UserRole.ADMIN,
      },
    });
    // eslint-disable-next-line no-console
    console.log('  ✓ Admin user updated:', adminEmail);
  }

  // ── 2. Optional demo host user for local flow (NO demo listings seeded) ──
  const hostEmail = 'host@dhyanastays.in';
  let hostUser = await prisma.user.findUnique({ where: { email: hostEmail } });
  if (!hostUser) {
    const passwordHash = await argon2.hash('ChangeMe123!');
    hostUser = await prisma.user.create({
      data: {
        email: hostEmail,
        fullName: 'Dhyana Demo Host',
        passwordHash,
        role: UserRole.HOST,
        isActive: true,
      },
    });
    // eslint-disable-next-line no-console
    console.log('  ✓ Host user created:', hostEmail);
  } else {
    // eslint-disable-next-line no-console
    console.log('  · Host user already exists, skipping.');
  }

  // ── 3. Keep host profile pending by default (requires admin approval) ─────
  const hostProfile = await prisma.host.findUnique({ where: { userId: hostUser.id } });
  if (!hostProfile) {
    await prisma.host.create({
      data: {
        userId: hostUser.id,
        verificationStatus: HostVerificationStatus.PENDING,
        payoutEnabled: false,
      },
    });
    // eslint-disable-next-line no-console
    console.log('  ✓ Host profile created with PENDING verification.');
  } else {
    // eslint-disable-next-line no-console
    console.log('  · Host profile already exists, keeping current verification status.');
  }

  // eslint-disable-next-line no-console
  console.log('\n🎉 Seed complete — no demo listings were seeded.');
  // eslint-disable-next-line no-console
  console.log('\nCredentials:');
  // eslint-disable-next-line no-console
  console.log('  Admin  → admin@dhyanastays.com / Password@123!');
  // eslint-disable-next-line no-console
  console.log('  Host   → host@dhyanastays.in    / ChangeMe123! (requires admin approval)');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
