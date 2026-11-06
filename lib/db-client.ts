import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";
import { PrismaClient } from "./generated/prisma/index.js";

export type PrismaClientResources = {
  prisma: PrismaClient;
  pool: Pool;
  disconnect: () => Promise<void>;
};

export function createPrismaClient(
  connectionString: string,
  poolSettings: Omit<PoolConfig, "connectionString"> = {},
  existingPool?: Pool,
): PrismaClientResources {
  const pool = existingPool ?? new Pool({ ...poolSettings, connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  return {
    prisma,
    pool,
    disconnect: async () => {
      try {
        await prisma.$disconnect();
      } finally {
        await pool.end();
      }
    },
  };
}
