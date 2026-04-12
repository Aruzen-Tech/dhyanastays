import { HostVerificationStatus, PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding Dhyana Stays database…');

  // ── 1. Admin user ──────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    // eslint-disable-next-line no-console
    console.log('  ⚠ ADMIN_EMAIL and ADMIN_PASSWORD env vars not set — skipping admin seed.');
    // eslint-disable-next-line no-console
    console.log('    Set them in .env to seed the admin user.');
  } else {
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
  }

  // ── 2. Host user (optional — requires env vars) ───────────────────────────
  const hostEmail = process.env.HOST_EMAIL;
  const hostPassword = process.env.HOST_PASSWORD;

  if (hostEmail && hostPassword) {
    let hostUser = await prisma.user.findUnique({ where: { email: hostEmail } });
    if (!hostUser) {
      const passwordHash = await argon2.hash(hostPassword);
      hostUser = await prisma.user.create({
        data: {
          email: hostEmail,
          fullName: 'Dhyana Host',
          passwordHash,
          role: UserRole.HOST,
          isActive: true,
        },
      });
      // eslint-disable-next-line no-console
      console.log('  ✓ Host user created:', hostEmail);
    }

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
    }
  }

  // ── 3. Default Tags / Amenities ───────────────────────────────────────────
  const tagData: { category: string; name: string }[] = [
    // Wellness
    { category: 'wellness', name: 'Yoga Studio' },
    { category: 'wellness', name: 'Meditation Hall' },
    { category: 'wellness', name: 'Ayurveda Spa' },
    { category: 'wellness', name: 'Naturopathy Centre' },
    { category: 'wellness', name: 'Sound Healing' },
    { category: 'wellness', name: 'Pranayama Classes' },
    { category: 'wellness', name: 'Detox Programs' },
    { category: 'wellness', name: 'Satsang Hall' },
    { category: 'wellness', name: 'Healing Garden' },
    { category: 'wellness', name: 'Massage Therapy' },
    // Diet & Food
    { category: 'diet', name: 'Sattvic Meals' },
    { category: 'diet', name: 'Vegan Cuisine' },
    { category: 'diet', name: 'Ayurvedic Cooking' },
    { category: 'diet', name: 'Organic Farm-to-Table' },
    { category: 'diet', name: 'Juice Cleanse' },
    { category: 'diet', name: 'Silent Dining' },
    { category: 'diet', name: 'Gluten-Free Options' },
    // Facilities
    { category: 'facilities', name: 'Swimming Pool' },
    { category: 'facilities', name: 'Hot Tub' },
    { category: 'facilities', name: 'Sauna' },
    { category: 'facilities', name: 'Steam Room' },
    { category: 'facilities', name: 'Wi-Fi' },
    { category: 'facilities', name: 'Air Conditioning' },
    { category: 'facilities', name: 'Library' },
    { category: 'facilities', name: 'Bonfire Area' },
    { category: 'facilities', name: 'Rooftop Terrace' },
    { category: 'facilities', name: 'River Access' },
    { category: 'facilities', name: 'Mountain View' },
    // Nature & Setting
    { category: 'nature', name: 'Beachfront' },
    { category: 'nature', name: 'Forest Retreat' },
    { category: 'nature', name: 'Himalayan Foothills' },
    { category: 'nature', name: 'Riverside' },
    { category: 'nature', name: 'Eco-friendly' },
    { category: 'nature', name: 'Off-grid' },
    { category: 'nature', name: 'Organic Farm' },
    // Programs & Activities
    { category: 'programs', name: 'Teacher Training (YTT)' },
    { category: 'programs', name: 'Silent Retreat' },
    { category: 'programs', name: 'Vipassana' },
    { category: 'programs', name: 'Shamanic Healing' },
    { category: 'programs', name: 'Breathwork' },
    { category: 'programs', name: 'Reiki' },
    { category: 'programs', name: 'Astrology Sessions' },
    { category: 'programs', name: 'Trekking' },
    { category: 'programs', name: 'Cultural Immersion' },
    // Practical
    { category: 'practical', name: 'Airport Transfer' },
    { category: 'practical', name: 'Parking' },
    { category: 'practical', name: 'Pet Friendly' },
    { category: 'practical', name: 'Solo Traveller Friendly' },
    { category: 'practical', name: 'Couple Packages' },
    { category: 'practical', name: 'Group Bookings' },
    { category: 'practical', name: '24h Security' },
  ];

  let tagsCreated = 0;
  for (const tag of tagData) {
    await prisma.tag.upsert({
      where: { category_name: { category: tag.category, name: tag.name } },
      update: {},
      create: tag,
    });
    tagsCreated++;
  }
  // eslint-disable-next-line no-console
  console.log(`  ✓ Tags upserted: ${tagsCreated} tags across 6 categories.`);

  // eslint-disable-next-line no-console
  console.log('\n🎉 Seed complete.');
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
