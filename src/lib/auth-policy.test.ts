import { describe, expect, it } from "vitest";
import {
  getAuthOrigin,
  getAuthSecret,
  getLoginClient,
  isSameOrigin,
  loginRateLimitKey,
  safeAuthRedirect,
} from "./auth-policy";

describe("authentication policy", () => {
  it("requires a sufficiently long secret without exposing its value", () => {
    expect(() => getAuthSecret("short")).toThrow(/AUTH_SECRET/);
    expect(getAuthSecret("s".repeat(32))).toHaveLength(32);
  });

  it("validates the configured origin", () => {
    expect(getAuthOrigin("https://catalog.example.com")).toBe(
      "https://catalog.example.com",
    );
    expect(() => getAuthOrigin("https://catalog.example.com/admin")).toThrow();
    expect(() => getAuthOrigin("javascript:invalid")).toThrow();
  });

  it("requires an exact origin and rejects missing or deceptive origins", () => {
    const origin = "https://catalog.example.com";
    expect(isSameOrigin(origin, origin)).toBe(true);
    expect(isSameOrigin(null, origin)).toBe(false);
    expect(isSameOrigin(`${origin}.evil.test`, origin)).toBe(false);
  });

  it("does not trust arbitrary forwarded IP headers", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.9" });
    expect(getLoginClient(headers, "")).toBe("shared");
    expect(getLoginClient(headers, "x-forwarded-for")).toBe("203.0.113.9");
    expect(
      getLoginClient(
        new Headers({ "x-forwarded-for": "invalid" }),
        "x-forwarded-for",
      ),
    ).toBe("shared");
    expect(
      getLoginClient(
        new Headers({ "x-forwarded-for": "203.0.113.9, 1.1.1.1" }),
        "x-forwarded-for",
      ),
    ).toBe("shared");
  });

  it("stores only scoped, keyed digests for account and client counters", () => {
    const secret = "s".repeat(32);
    const accountKey = loginRateLimitKey(
      "account",
      "admin@example.test",
      secret,
    );
    expect(accountKey).toMatch(/^[a-f0-9]{64}$/);
    expect(accountKey).not.toContain("admin");
    expect(accountKey).not.toBe(
      loginRateLimitKey("client", "admin@example.test", secret),
    );
    expect(accountKey).not.toBe(
      loginRateLimitKey("account", "admin@example.test", "t".repeat(32)),
    );
  });

  it("keeps redirects on the configured origin and allowed paths", () => {
    const origin = "https://catalog.example.com";
    expect(safeAuthRedirect("/admin/login", origin)).toBe(
      `${origin}/admin/login`,
    );
    expect(safeAuthRedirect("https://evil.test/admin", origin)).toBe(
      `${origin}/admin`,
    );
    expect(safeAuthRedirect("//evil.test/admin", origin)).toBe(
      `${origin}/admin`,
    );
    expect(safeAuthRedirect("/administrator", origin)).toBe(`${origin}/admin`);
  });
});
