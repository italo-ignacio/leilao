import { describe, expect, it } from "vitest";
import {
  resolveTestDatabaseUrl,
  validateTestDatabaseUrl,
} from "./test-database-target";

const azureUrl =
  "postgresql://user:password@db-general.postgres.database.azure.com:5432/leiloes?schema=public&sslmode=require";

describe("test database target guard", () => {
  it("uses local databases without remote opt-in", () => {
    expect(
      validateTestDatabaseUrl(
        "postgresql://user:password@127.0.0.1:55432/leiloes",
      ),
    ).toContain("127.0.0.1");
  });

  it("requires explicit opt-in and exact Azure database, host, port and SSL", () => {
    expect(() => validateTestDatabaseUrl(azureUrl)).toThrow();
    expect(validateTestDatabaseUrl(azureUrl, "leiloes")).toBe(azureUrl);
    expect(() =>
      validateTestDatabaseUrl(
        azureUrl.replace("/leiloes?", "/production?"),
        "leiloes",
      ),
    ).toThrow();
    expect(() =>
      validateTestDatabaseUrl(
        azureUrl.replace("postgres.database.azure.com", "example.com"),
        "leiloes",
      ),
    ).toThrow();
    expect(() =>
      validateTestDatabaseUrl(azureUrl.replace(":5432/", ":5433/"), "leiloes"),
    ).toThrow();
    expect(() =>
      validateTestDatabaseUrl(
        azureUrl.replace("sslmode=require", "sslmode=disable"),
        "leiloes",
      ),
    ).toThrow();
  });

  it("does not silently select the app database without the explicit opt-in", () => {
    const local = "postgresql://user:password@localhost:55432/leiloes";
    expect(
      resolveTestDatabaseUrl({ databaseUrl: azureUrl, localFallback: local }),
    ).toBe(local);
    expect(
      resolveTestDatabaseUrl({
        databaseUrl: azureUrl,
        allowRemoteDatabase: "leiloes",
      }),
    ).toBe(azureUrl);
    expect(() =>
      resolveTestDatabaseUrl({
        explicitTestUrl: azureUrl,
        databaseUrl: azureUrl,
        localFallback: local,
      }),
    ).toThrow();
  });
});
