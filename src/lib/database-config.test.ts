import { describe, expect, it } from "vitest";
import { getDatabaseConfig } from "./database-config";

describe("database configuration", () => {
  it("requires verified TLS remotely and preserves URL-encoded passwords", () => {
    const config = getDatabaseConfig(
      "postgresql://user:example%40password@db.example.com:5432/leiloes?schema=public&sslmode=require&connection_limit=3",
    );
    expect(config.schema).toBe("public");
    expect(config.pool.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.pool.max).toBe(3);
    const url = new URL(config.pool.connectionString!);
    expect(url.password).toBe("example%40password");
    expect(url.searchParams.has("sslmode")).toBe(false);
    expect(url.searchParams.has("schema")).toBe(false);
  });

  it("uses TLS for remote hosts even without sslmode", () => {
    expect(
      getDatabaseConfig("postgresql://user:password@db.example.com/leiloes")
        .pool.ssl,
    ).toEqual({ rejectUnauthorized: true });
  });

  it("supports a local Docker database without TLS", () => {
    expect(
      getDatabaseConfig(
        "postgresql://user:password@127.0.0.1:55432/leiloes?schema=public",
      ).pool.ssl,
    ).toBeUndefined();
  });

  it.each([
    undefined,
    "not-a-url",
    "https://example.com/database",
    "postgresql://user:password@db.example.com/leiloes?sslmode=disable",
    "postgresql://user:password@db.example.com/leiloes?sslmode=prefer",
    "postgresql://user:password@db.example.com/leiloes?sslaccept=accept_invalid_certs",
    "postgresql://user:password@db.example.com/leiloes?uselibpqcompat=true",
    "postgresql://user:password@localhost/leiloes?connection_limit=0",
    "postgresql://user:password@localhost/leiloes?schema=public;drop",
  ])("rejects invalid or insecure configuration", (url) => {
    expect(() => getDatabaseConfig(url)).toThrow();
  });
});
