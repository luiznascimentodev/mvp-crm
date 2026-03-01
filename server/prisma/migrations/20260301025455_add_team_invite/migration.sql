-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "team_invites" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "invitedById" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_token_key" ON "team_invites"("token");

-- CreateIndex
CREATE INDEX "team_invites_tenantId_idx" ON "team_invites"("tenantId");

-- CreateIndex
CREATE INDEX "team_invites_token_idx" ON "team_invites"("token");

-- CreateIndex
CREATE INDEX "team_invites_email_idx" ON "team_invites"("email");

-- CreateIndex
CREATE INDEX "team_invites_status_idx" ON "team_invites"("status");

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
