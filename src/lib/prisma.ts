import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.ENVIRONMENT === 'prod' ? ['error'] : ['query', 'error', 'warn'],
  });

if (process.env.ENVIRONMENT !== 'prod') globalForPrisma.prisma = prisma;
