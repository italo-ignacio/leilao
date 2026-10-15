import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  rateLimit: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
}));
vi.mock("argon2", () => ({
  argon2id: 2,
  hash: vi.fn().mockResolvedValue("dummy-hash"),
  verify: mocks.verify,
}));
vi.mock("./login-rate-limit", () => ({
  consumeLoginRateLimit: mocks.rateLimit,
}));
import {
  authenticateAdmin,
  findActiveAdmin,
  LoginRateLimitError,
} from "./auth-service";

const client = {
  user: { findUnique: mocks.findUnique, findFirst: mocks.findFirst },
} as unknown as PrismaClient;
const input = {
  email: "ADMIN@example.test",
  password: "a-valid-test-password",
};
const user = {
  id: "admin-id",
  name: "Admin",
  email: "admin@example.test",
  passwordHash: "real-hash",
  role: "ADMIN",
  active: true,
  deletedAt: null,
  updatedAt: new Date("2026-10-14T12:00:00Z"),
};
const secret = "s".repeat(32);

beforeEach(() => {
  mocks.verify.mockReset().mockResolvedValue(true);
  mocks.rateLimit.mockReset().mockResolvedValue(true);
  mocks.findUnique.mockReset().mockResolvedValue(user);
  mocks.findFirst.mockReset().mockResolvedValue(null);
});

describe("admin authentication", () => {
  it("only returns safe identity fields after password verification", async () => {
    const result = await authenticateAdmin(
      client,
      input,
      new Headers(),
      secret,
    );
    expect(result).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "ADMIN",
      authVersion: user.updatedAt.getTime(),
    });
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { email: "admin@example.test" },
    });
    expect(mocks.verify).toHaveBeenCalledWith("real-hash", input.password);
    expect(result).not.toHaveProperty("passwordHash");
  });

  it.each([
    null,
    { ...user, active: false },
    { ...user, role: "VIEWER" },
    { ...user, deletedAt: new Date() },
  ])("does not authenticate an unavailable admin", async (record) => {
    mocks.findUnique.mockResolvedValue(record);
    expect(
      await authenticateAdmin(client, input, new Headers(), secret),
    ).toBeNull();
    expect(mocks.verify).toHaveBeenCalledTimes(1);
    if (!record)
      expect(mocks.verify).toHaveBeenCalledWith("dummy-hash", input.password);
  });

  it("rejects incorrect passwords and malformed hashes", async () => {
    mocks.verify.mockResolvedValue(false);
    expect(
      await authenticateAdmin(client, input, new Headers(), secret),
    ).toBeNull();
    mocks.verify.mockRejectedValue(new Error("invalid hash"));
    expect(
      await authenticateAdmin(client, input, new Headers(), secret),
    ).toBeNull();
  });

  it("stops before looking up a user when rate limited", async () => {
    mocks.rateLimit.mockResolvedValue(false);
    await expect(
      authenticateAdmin(client, input, new Headers(), secret),
    ).rejects.toBeInstanceOf(LoginRateLimitError);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("does not bypass a failed rate limit database", async () => {
    mocks.rateLimit.mockRejectedValue(new Error("database unavailable"));
    await expect(
      authenticateAdmin(client, input, new Headers(), secret),
    ).rejects.toThrow();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejects invalid input without hashing or looking up a user", async () => {
    expect(
      await authenticateAdmin(client, {}, new Headers(), secret),
    ).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.verify).not.toHaveBeenCalled();
  });
});

describe("fresh authorization", () => {
  it("rechecks role, activation, deletion and the account update version", async () => {
    await findActiveAdmin(client, user.id, user.updatedAt.getTime());
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: user.id,
        role: "ADMIN",
        active: true,
        deletedAt: null,
        updatedAt: user.updatedAt,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  });

  it("rejects missing or invalid identity without querying", async () => {
    expect(await findActiveAdmin(client, undefined, undefined)).toBeNull();
    expect(await findActiveAdmin(client, user.id, Number.NaN)).toBeNull();
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});
