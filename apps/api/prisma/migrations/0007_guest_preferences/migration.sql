-- Guest wellness preferences
CREATE TABLE "GuestPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dietaryNeeds" TEXT[],
    "wellnessInterests" TEXT[],
    "accessibility" TEXT,
    "roomPreference" TEXT,
    "experienceLevel" TEXT,
    "arrivalPreference" TEXT,
    "emergencyContact" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestPreference_userId_key" ON "GuestPreference"("userId");

ALTER TABLE "GuestPreference" ADD CONSTRAINT "GuestPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preparation guide on listings
ALTER TABLE "Listing" ADD COLUMN "preparationGuide" JSONB;
