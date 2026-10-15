import { describe, expect, it } from "vitest";
import { credentialsSchema } from "./credentials-schema";

describe("login credentials", () => {
  it("normalizes email but preserves the password exactly", () => {
    const password = " a valid password ";
    expect(
      credentialsSchema.parse({ email: " ADMIN@example.test ", password }),
    ).toEqual({ email: "admin@example.test", password });
  });

  it.each([
    {},
    { email: "invalid", password: "a-valid-password" },
    { email: "admin@example.test", password: "short" },
    { email: "admin@example.test", password: "x".repeat(129) },
    { email: "admin@example.test", password: 123456789012 },
  ])("rejects invalid input", (input) => {
    expect(credentialsSchema.safeParse(input).success).toBe(false);
  });
});
