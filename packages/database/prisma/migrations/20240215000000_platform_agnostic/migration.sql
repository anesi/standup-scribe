-- Migration: Platform-Agnostic Schema (workspaceId + platform metadata)
-- Transforms Discord-specific schema to platform-agnostic while preserving data

-- Step 1: Add platform fields and new workspaceId
ALTER TABLE "WorkspaceConfig" ADD COLUMN "platformType" TEXT NOT NULL DEFAULT 'DISCORD';
ALTER TABLE "WorkspaceConfig" ADD COLUMN "platformMetadata" JSONB;
ALTER TABLE "WorkspaceConfig" ADD COLUMN "workspaceId_new" TEXT;

-- Step 2: Populate workspaceId from existing guildId
UPDATE "WorkspaceConfig" SET "workspaceId_new" = "guildId";

-- Step 3: Enforce not-null + uniqueness on workspaceId
ALTER TABLE "WorkspaceConfig" ALTER COLUMN "workspaceId_new" SET NOT NULL;
CREATE UNIQUE INDEX "WorkspaceConfig_workspaceId_new_key" ON "WorkspaceConfig"("workspaceId_new");

-- Step 4: Preserve legacy guildId while renaming
ALTER TABLE "WorkspaceConfig" RENAME COLUMN "guildId" TO "guildId_old";
ALTER TABLE "WorkspaceConfig" RENAME COLUMN "workspaceId_new" TO "workspaceId";

-- Step 5: Drop old unique constraint and re-add nullable guildId for backward compatibility
DROP INDEX IF EXISTS "WorkspaceConfig_guildId_key";
ALTER TABLE "WorkspaceConfig" ADD COLUMN "guildId" TEXT UNIQUE;
UPDATE "WorkspaceConfig" SET "guildId" = "guildId_old";
ALTER TABLE "WorkspaceConfig" DROP COLUMN IF EXISTS "guildId_old";

-- Step 6: Create platform lookup index
CREATE INDEX IF NOT EXISTS "WorkspaceConfig_platformType_workspaceId_idx" ON "WorkspaceConfig"("platformType", "workspaceId");

-- Step 7: RosterMember -> workspaceId
ALTER TABLE "RosterMember" ADD COLUMN "workspaceId_new" TEXT;
UPDATE "RosterMember" rm
SET "workspaceId_new" = wc."workspaceId"
FROM "WorkspaceConfig" wc
WHERE rm."guildId" = wc.id;
ALTER TABLE "RosterMember" ALTER COLUMN "workspaceId_new" SET NOT NULL;
ALTER TABLE "RosterMember" DROP CONSTRAINT IF EXISTS "RosterMember_guildId_fkey";
ALTER TABLE "RosterMember" DROP COLUMN IF EXISTS "guildId";
ALTER TABLE "RosterMember" RENAME COLUMN "workspaceId_new" TO "workspaceId";
ALTER TABLE "RosterMember" ADD CONSTRAINT "RosterMember_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "WorkspaceConfig"("workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "RosterMember_guildId_userId_key";
CREATE UNIQUE INDEX "RosterMember_workspaceId_userId_key" ON "RosterMember"("workspaceId", "userId");
CREATE INDEX IF NOT EXISTS "RosterMember_workspaceId_isActive_idx" ON "RosterMember"("workspaceId", "isActive");

-- Step 8: StandupRun -> workspaceId
ALTER TABLE "StandupRun" ADD COLUMN "workspaceId_new" TEXT;
UPDATE "StandupRun" sr
SET "workspaceId_new" = wc."workspaceId"
FROM "WorkspaceConfig" wc
WHERE sr."guildId" = wc.id;
ALTER TABLE "StandupRun" ALTER COLUMN "workspaceId_new" SET NOT NULL;
ALTER TABLE "StandupRun" DROP CONSTRAINT IF EXISTS "StandupRun_guildId_fkey";
ALTER TABLE "StandupRun" DROP COLUMN IF EXISTS "guildId";
ALTER TABLE "StandupRun" RENAME COLUMN "workspaceId_new" TO "workspaceId";
ALTER TABLE "StandupRun" ADD CONSTRAINT "StandupRun_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "WorkspaceConfig"("workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "StandupRun_guildId_runDate_key";
CREATE UNIQUE INDEX "StandupRun_workspaceId_runDate_key" ON "StandupRun"("workspaceId", "runDate");
DROP INDEX IF EXISTS "StandupRun_guildId_runDate_status_idx";
CREATE INDEX "StandupRun_workspaceId_runDate_status_idx" ON "StandupRun"("workspaceId", "runDate", "status");

-- Step 9: AuditEvent -> workspaceId
ALTER TABLE "AuditEvent" ADD COLUMN "workspaceId_new" TEXT;
UPDATE "AuditEvent" ae
SET "workspaceId_new" = wc."workspaceId"
FROM "WorkspaceConfig" wc
WHERE ae."guildId" = wc.id;
ALTER TABLE "AuditEvent" ALTER COLUMN "workspaceId_new" SET NOT NULL;
ALTER TABLE "AuditEvent" DROP CONSTRAINT IF EXISTS "AuditEvent_guildId_fkey";
ALTER TABLE "AuditEvent" DROP COLUMN IF EXISTS "guildId";
ALTER TABLE "AuditEvent" RENAME COLUMN "workspaceId_new" TO "workspaceId";
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "WorkspaceConfig"("workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "AuditEvent_guildId_actionType_createdAt_idx";
CREATE INDEX "AuditEvent_workspaceId_actionType_createdAt_idx" ON "AuditEvent"("workspaceId", "actionType", "createdAt");

-- Step 10: Add SLACK to Destination enum
ALTER TYPE "Destination" RENAME TO "Destination_old";
CREATE TYPE "Destination" AS ENUM ('DISCORD', 'SLACK', 'SHEETS', 'NOTION', 'CSV');
ALTER TABLE "DeliveryJob" ALTER COLUMN "destination" TYPE "Destination" USING
  CASE "destination"
    WHEN 'DISCORD' THEN 'DISCORD'::"Destination"
    WHEN 'SHEETS' THEN 'SHEETS'::"Destination"
    WHEN 'NOTION' THEN 'NOTION'::"Destination"
    WHEN 'CSV' THEN 'CSV'::"Destination"
    ELSE 'DISCORD'::"Destination"
  END;
DROP TYPE "Destination_old";

-- Migration complete: schema is now platform-agnostic and keyed by workspaceId
