import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dropTables() {
  console.log('Dropping old tables...');

  // Drop tables in reverse order of dependencies
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "DeliveryJob" CASCADE;');
  console.log('✓ Dropped DeliveryJob');

  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "StandupResponse" CASCADE;');
  console.log('✓ Dropped StandupResponse');

  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Excusal" CASCADE;');
  console.log('✓ Dropped Excusal');

  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "StandupRun" CASCADE;');
  console.log('✓ Dropped StandupRun');

  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "RosterMember" CASCADE;');
  console.log('✓ Dropped RosterMember');

  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "AuditEvent" CASCADE;');
  console.log('✓ Dropped AuditEvent');

  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "WorkspaceConfig" CASCADE;');
  console.log('✓ Dropped WorkspaceConfig');

  await prisma.$disconnect();
  console.log('All old tables dropped successfully!');
}

dropTables().catch(console.error);
