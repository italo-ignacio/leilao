import "server-only";
import { createDatabaseClient } from "./database";

const globalDatabase = globalThis as unknown as {
  prisma?: ReturnType<typeof createDatabaseClient>;
};

export const prisma = globalDatabase.prisma ?? createDatabaseClient();

if (process.env.NODE_ENV !== "production") globalDatabase.prisma = prisma;
