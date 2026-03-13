-- Migration: 0002_auth0
-- Adds auth0Sub (optional, unique) to User table
-- Makes passwordHash nullable (Auth0 users have no local password)

ALTER TABLE "User" ADD COLUMN "auth0Sub" TEXT;
CREATE UNIQUE INDEX "User_auth0Sub_key" ON "User"("auth0Sub");
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
