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
    const legacyAdminEmail = 'admin@dhyanastays.local';
    const adminEmail = 'admin@dhyanastays.com';
    const adminPassword = 'Password@123!';
    await prisma.user.updateMany({
        where: { email: legacyAdminEmail, role: client_1.UserRole.ADMIN },
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
    const hostEmail = 'host@dhyanastays.in';
    let hostUser = await prisma.user.findUnique({ where: { email: hostEmail } });
    if (!hostUser) {
        const passwordHash = await argon2.hash('ChangeMe123!');
        hostUser = await prisma.user.create({
            data: {
                email: hostEmail,
                fullName: 'Dhyana Demo Host',
                passwordHash,
                role: client_1.UserRole.HOST,
                isActive: true,
            },
        });
        console.log('  ✓ Host user created:', hostEmail);
    }
    else {
        console.log('  · Host user already exists, skipping.');
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
    else {
        console.log('  · Host profile already exists, keeping current verification status.');
    }
    console.log('\n🎉 Seed complete — no demo listings were seeded.');
    console.log('\nCredentials:');
    console.log('  Admin  → admin@dhyanastays.com / Password@123!');
    console.log('  Host   → host@dhyanastays.in    / ChangeMe123! (requires admin approval)');
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