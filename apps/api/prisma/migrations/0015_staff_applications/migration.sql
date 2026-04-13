-- Migration 0015_staff_applications
-- Admin registration queue and staff management

CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "StaffApplication" (
    "id"               TEXT NOT NULL,
    "applicantId"      TEXT,
    "email"            TEXT NOT NULL,
    "fullName"         TEXT NOT NULL,
    "requestedLevel"   "AdminLevel" NOT NULL,
    "requestedService" "ServiceType",
    "clusterId"        TEXT,
    "propertyId"       TEXT,
    "justification"    TEXT NOT NULL,
    "status"           "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy"       TEXT,
    "reviewNotes"      TEXT,
    "reviewedAt"       TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StaffApplication_status_createdAt_idx" ON "StaffApplication"("status", "createdAt");
CREATE INDEX "StaffApplication_applicantId_idx"      ON "StaffApplication"("applicantId");
