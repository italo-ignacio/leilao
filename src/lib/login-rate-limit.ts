import { Prisma, type PrismaClient } from "../generated/prisma/client";
import {
  ACCOUNT_LOGIN_LIMIT,
  CLIENT_LOGIN_LIMIT,
  SHARED_LOGIN_LIMIT,
  LOGIN_WINDOW_SECONDS,
  loginRateLimitKey,
} from "./auth-policy";

export async function consumeLoginRateLimit(
  client: PrismaClient,
  email: string,
  clientAddress: string,
  secret: string,
): Promise<boolean> {
  const clientLimit =
    clientAddress === "shared" ? SHARED_LOGIN_LIMIT : CLIENT_LOGIN_LIMIT;
  const buckets = [
    {
      key: loginRateLimitKey("client", clientAddress, secret),
      limit: clientLimit,
    },
    {
      key: loginRateLimitKey("account", email, secret),
      limit: ACCOUNT_LOGIN_LIMIT,
    },
  ];

  return client.$transaction(
    async (transaction) => {
      for (const bucket of buckets) {
        const rows = await transaction.$queryRaw<{ hits: number }[]>(Prisma.sql`
        INSERT INTO "login_rate_limits" ("key", "hits", "expiresAt")
        VALUES (${bucket.key}, 1, CURRENT_TIMESTAMP + ${LOGIN_WINDOW_SECONDS} * INTERVAL '1 second')
        ON CONFLICT ("key") DO UPDATE SET
          "hits" = CASE WHEN "login_rate_limits"."expiresAt" <= CURRENT_TIMESTAMP
            THEN 1 ELSE LEAST("login_rate_limits"."hits" + 1, ${bucket.limit + 1}) END,
          "expiresAt" = CASE WHEN "login_rate_limits"."expiresAt" <= CURRENT_TIMESTAMP
            THEN CURRENT_TIMESTAMP + ${LOGIN_WINDOW_SECONDS} * INTERVAL '1 second'
            ELSE "login_rate_limits"."expiresAt" END
        RETURNING "hits"
      `);
        if (!rows[0] || rows[0].hits > bucket.limit) return false;
      }
      return true;
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}
