-- Migration 0014_identity_security
-- Phase 0: refresh token family tracking + MFA
-- Phase 1: extended identity model (UserKind, StaffRole, OwnerProfile, InvestorProfile, RoleChangeAudit)

-- ─── Phase 1 enums ────────────────────────────────────────────────────────────

CREATE TYPE "UserKind" AS ENUM ('GUEST', 'OWNER', 'INVESTOR', 'STAFF');
CREATE TYPE "AdminLevel" AS ENUM ('L1', 'L2', 'L3', 'L4', 'L5');
CREATE TYPE "ServiceType" AS ENUM ('TRANSPORT', 'FOOD', 'WELLNESS', 'EXPERIENCE', 'CONCIERGE', 'HOUSEKEEPING');
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "MfaType" AS ENUM ('TOTP', 'SMS', 'EMAIL');

-- ─── Phase 1: User.kind column ───────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN "kind" "UserKind";

-- Backfill: map existing UserRole to UserKind
UPDATE "User" SET "kind" = 'GUEST'  WHERE "role" = 'GUEST';
UPDATE "User" SET "kind" = 'OWNER'  WHERE "role" = 'HOST';
UPDATE "User" SET "kind" = 'STAFF'  WHERE "role" = 'ADMIN';

-- Drop old plaintext refreshToken (replaced by RefreshTokenFamily/RefreshToken)
ALTER TABLE "User" DROP COLUMN IF EXISTS "refreshToken";

-- ─── Phase 0: Refresh token family tracking ───────────────────────────────────

CREATE TABLE "RefreshTokenFamily" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt"    TIMESTAMP(3),
    "revokeReason" TEXT,
    CONSTRAINT "RefreshTokenFamily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshToken" (
    "id"          TEXT NOT NULL,
    "familyId"    TEXT NOT NULL,
    "tokenHash"   TEXT NOT NULL,
    "issuedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "rotatedTo"   TEXT,
    "usedAt"      TIMESTAMP(3),
    "ipAddress"   TEXT,
    "userAgent"   TEXT,
    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "familyId"  TEXT NOT NULL,
    "device"    TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "lastSeen"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MfaFactor" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "type"      "MfaType" NOT NULL,
    "secret"    TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MfaFactor_pkey" PRIMARY KEY ("id")
);

-- ─── Phase 1: Identity models ─────────────────────────────────────────────────

CREATE TABLE "StaffRole" (
    "userId"      TEXT NOT NULL,
    "level"       "AdminLevel" NOT NULL,
    "clusterId"   TEXT,
    "propertyId"  TEXT,
    "serviceType" "ServiceType",
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt"   TIMESTAMP(3),
    "createdBy"   TEXT NOT NULL,
    CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "OwnerProfile" (
    "userId"    TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "gstin"     TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OwnerProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "InvestorProfile" (
    "userId"    TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "panMasked" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InvestorProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "RoleChangeAudit" (
    "id"           TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "actorUserId"  TEXT NOT NULL,
    "before"       JSONB NOT NULL,
    "after"        JSONB NOT NULL,
    "reason"       TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoleChangeAudit_pkey" PRIMARY KEY ("id")
);

-- Backfill: create OwnerProfile rows from existing Host records
INSERT INTO "OwnerProfile" ("userId", "legalName", "kycStatus", "createdAt", "updatedAt")
SELECT u."id", u."fullName", 'PENDING', NOW(), NOW()
FROM "User" u
WHERE u."role" = 'HOST'
ON CONFLICT DO NOTHING;

-- Backfill: create StaffRole rows for existing ADMIN users (L1 by default)
INSERT INTO "StaffRole" ("userId", "level", "createdAt", "createdBy")
SELECT u."id", 'L1', NOW(), u."id"
FROM "User" u
WHERE u."role" = 'ADMIN'
ON CONFLICT DO NOTHING;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX "RefreshTokenFamily_userId_idx" ON "RefreshTokenFamily"("userId");
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX "MfaFactor_userId_type_key" ON "MfaFactor"("userId", "type");
CREATE INDEX "MfaFactor_userId_idx" ON "MfaFactor"("userId");
CREATE INDEX "StaffRole_level_idx" ON "StaffRole"("level");
CREATE INDEX "RoleChangeAudit_targetUserId_idx" ON "RoleChangeAudit"("targetUserId");
CREATE INDEX "RoleChangeAudit_actorUserId_idx" ON "RoleChangeAudit"("actorUserId");

-- ─── Foreign keys ─────────────────────────────────────────────────────────────

ALTER TABLE "RefreshTokenFamily" ADD CONSTRAINT "RefreshTokenFamily_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_familyId_fkey"
    FOREIGN KEY ("familyId") REFERENCES "RefreshTokenFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MfaFactor" ADD CONSTRAINT "MfaFactor_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StaffRole" ADD CONSTRAINT "StaffRole_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OwnerProfile" ADD CONSTRAINT "OwnerProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvestorProfile" ADD CONSTRAINT "InvestorProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
