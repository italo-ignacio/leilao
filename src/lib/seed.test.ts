import { describe, expect, it } from "vitest";
import { seedEnvironmentSchema } from "./seed";

const environment = {
  DATABASE_URL: "postgresql://user:password@localhost:55432/leiloes",
  ADMIN_EMAIL: " ADMIN@example.test ",
  ADMIN_PASSWORD: "example-only-password",
};

describe("seed safeguards", () => {
  it("normalizes email and disables fictitious data by default", () => {
    const parsed = seedEnvironmentSchema.parse(environment);
    expect(parsed.ADMIN_EMAIL).toBe("admin@example.test");
    expect(parsed.SEED_DEMO_DATA).toBe("false");
  });

  it("rejects absent credentials and short passwords", () => {
    expect(seedEnvironmentSchema.safeParse({}).success).toBe(false);
    expect(
      seedEnvironmentSchema.safeParse({
        ...environment,
        ADMIN_PASSWORD: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects fictitious data on a remote database", () => {
    expect(
      seedEnvironmentSchema.safeParse({
        ...environment,
        DATABASE_URL:
          "postgresql://user:password@db.example.com/leiloes?sslmode=require",
        SEED_DEMO_DATA: "true",
      }).success,
    ).toBe(false);
  });

  it("allows an explicitly requested demonstration only locally", () => {
    expect(
      seedEnvironmentSchema.safeParse({
        ...environment,
        SEED_DEMO_DATA: "true",
      }).success,
    ).toBe(true);
  });
});
