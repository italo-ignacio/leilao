import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { getDatabaseConfig } from "./database-config";

export function createDatabaseClient(databaseUrl = process.env.DATABASE_URL) {
  const { pool, schema } = getDatabaseConfig(databaseUrl);
  return new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
}
