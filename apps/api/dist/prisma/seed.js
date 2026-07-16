"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding Dhyana Stays database…');
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
        console.log('  [!] ADMIN_EMAIL and ADMIN_PASSWORD env vars not set - skipping admin seed.');
        console.log('    Set them in .env to seed the admin user.');
    }
    else {
        const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
        const adminPasswordHash = await argon2.hash(adminPassword);
        if (!admin) {
            await prisma.user.create({
                data: {
                    email: adminEmail,
                    fullName: 'Dhyana Admin',
                    passwordHash: adminPasswordHash,
                    role: client_1.UserRole.ADMIN,
                    isActive: true,
                },
            });
            console.log('  ✓ Admin user created:', adminEmail);
        }
        else {
            await prisma.user.update({
                where: { email: adminEmail },
                data: {
                    passwordHash: adminPasswordHash,
                    isActive: true,
                    role: client_1.UserRole.ADMIN,
                },
            });
            console.log('  ✓ Admin user updated:', adminEmail);
        }
    }
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
                    role: client_1.UserRole.HOST,
                    isActive: true,
                },
            });
            console.log('  ✓ Host user created:', hostEmail);
        }
        const hostProfile = await prisma.host.findUnique({ where: { userId: hostUser.id } });
        if (!hostProfile) {
            await prisma.host.create({
                data: {
                    userId: hostUser.id,
                    verificationStatus: client_1.HostVerificationStatus.PENDING,
                    payoutEnabled: false,
                },
            });
            console.log('  ✓ Host profile created with PENDING verification.');
        }
    }
    const tagData = [
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
        { category: 'diet', name: 'Sattvic Meals' },
        { category: 'diet', name: 'Vegan Cuisine' },
        { category: 'diet', name: 'Ayurvedic Cooking' },
        { category: 'diet', name: 'Organic Farm-to-Table' },
        { category: 'diet', name: 'Juice Cleanse' },
        { category: 'diet', name: 'Silent Dining' },
        { category: 'diet', name: 'Gluten-Free Options' },
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
        { category: 'nature', name: 'Beachfront' },
        { category: 'nature', name: 'Forest Retreat' },
        { category: 'nature', name: 'Himalayan Foothills' },
        { category: 'nature', name: 'Riverside' },
        { category: 'nature', name: 'Eco-friendly' },
        { category: 'nature', name: 'Off-grid' },
        { category: 'nature', name: 'Organic Farm' },
        { category: 'programs', name: 'Teacher Training (YTT)' },
        { category: 'programs', name: 'Silent Retreat' },
        { category: 'programs', name: 'Vipassana' },
        { category: 'programs', name: 'Shamanic Healing' },
        { category: 'programs', name: 'Breathwork' },
        { category: 'programs', name: 'Reiki' },
        { category: 'programs', name: 'Astrology Sessions' },
        { category: 'programs', name: 'Trekking' },
        { category: 'programs', name: 'Cultural Immersion' },
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
    console.log(`  ✓ Tags upserted: ${tagsCreated} tags across 6 categories.`);
    console.log('\n🎉 Seed complete.');
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map