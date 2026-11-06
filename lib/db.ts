import { Pool } from 'pg';
import { createPrismaClient as createPrismaClientResources } from './db-client';
import type { PrismaClientResources } from './db-client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClientResources['prisma'] | undefined;
  pool: Pool | undefined;
};

function createApplicationPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const { prisma, pool } = createPrismaClientResources(
    connectionString,
    {
      max: 1,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
    globalForPrisma.pool,
  );
  globalForPrisma.pool = pool;
  return prisma;
}

export const prisma = globalForPrisma.prisma ?? createApplicationPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
