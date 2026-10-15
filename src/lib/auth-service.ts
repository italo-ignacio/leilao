import { argon2id, hash, verify } from "argon2";
import type { PrismaClient } from "../generated/prisma/client";
import { credentialsSchema } from "./credentials-schema";
import { getAuthSecret, getLoginClient } from "./auth-policy";
import { consumeLoginRateLimit } from "./login-rate-limit";

const dummyHash = hash("authentication-timing-padding-only", {
  type: argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
});

export class LoginRateLimitError extends Error {
  constructor() {
    super("Limite de tentativas de login atingido.");
    this.name = "LoginRateLimitError";
  }
}

export async function authenticateAdmin(
  client: PrismaClient,
  input: unknown,
  requestHeaders: Headers,
  secret = getAuthSecret(),
) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  if (
    !(await consumeLoginRateLimit(
      client,
      email,
      getLoginClient(requestHeaders),
      secret,
    ))
  )
    throw new LoginRateLimitError();

  const user = await client.user.findUnique({ where: { email } });
  const paddingHash = await dummyHash;
  let valid = false;
  try {
    valid = await verify(user?.passwordHash ?? paddingHash, password);
  } catch {
    valid = false;
  }

  if (
    !valid ||
    !user ||
    user.role !== "ADMIN" ||
    !user.active ||
    user.deletedAt
  )
    return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: "ADMIN" as const,
    authVersion: user.updatedAt.getTime(),
  };
}

export async function findActiveAdmin(
  client: PrismaClient,
  id: unknown,
  authVersion: unknown,
) {
  if (
    typeof id !== "string" ||
    id.length < 1 ||
    id.length > 128 ||
    typeof authVersion !== "number" ||
    !Number.isSafeInteger(authVersion) ||
    authVersion < 0 ||
    authVersion > 8_640_000_000_000_000
  )
    return null;
  return client.user.findFirst({
    where: {
      id,
      role: "ADMIN",
      active: true,
      deletedAt: null,
      updatedAt: new Date(authVersion),
    },
    select: { id: true, name: true, email: true, role: true },
  });
}
