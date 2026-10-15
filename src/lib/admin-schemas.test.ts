import { describe, expect, it } from "vitest";
import {
  auctionFormSchema,
  normalizeDecimalInput,
  parseAdminDate,
  toAdminDate,
} from "./admin-schemas";

describe("admin decimals", () => {
  it.each([
    ["2.069,00", "2069.00"],
    ["824", "824.00"],
    ["0", "0.00"],
    ["0001,2", "1.20"],
    ["9.999.999.999.999.999,99", "9999999999999999.99"],
  ])("normalizes %s without float", (input, expected) => {
    expect(normalizeDecimalInput(input)).toBe(expected);
  });
  it.each([
    "-1,00",
    "1e3",
    "1.99",
    "1,999",
    "10000000000000000,00",
    "",
    "NaN",
    "Infinity",
  ])("rejects %s", (input) => {
    expect(() => normalizeDecimalInput(input)).toThrow();
  });
  it("preserves fractional quantities", () => {
    expect(normalizeDecimalInput("0,125", 3, 11)).toBe("0.125");
  });
});

describe("admin dates", () => {
  it("round-trips the Brazilian local display without browser timezone inference", () => {
    const date = parseAdminDate("2026-11-04T08:00");
    expect(date?.toISOString()).toBe("2026-11-04T11:00:00.000Z");
    expect(toAdminDate(date)).toBe("2026-11-04T08:00");
    expect(parseAdminDate("")).toBeNull();
    expect(toAdminDate(null)).toBe("");
  });
  it("accepts absent dates but rejects inverted periods and non-HTTPS URLs", () => {
    const input = {
      version: "",
      officialNumber: "0800100/000014/2026",
      title: "Edital",
      agency: "RFB",
      unit: "Unidade",
      mode: "UNKNOWN",
      officialUrl: "https://www.gov.br/edital",
      noticeDocumentUrl: "",
      publicationStatus: "DRAFT",
      statusOverride: "",
      sourceStatus: "Disponibilizado",
      proposalStartsAt: "",
      proposalEndsAt: "",
      classificationAt: "",
      biddingStartsAt: "",
      biddingEndsAt: "",
    };
    expect(auctionFormSchema.safeParse(input).success).toBe(true);
    expect(
      auctionFormSchema.safeParse({
        ...input,
        proposalStartsAt: "2026-11-05T08:00",
        proposalEndsAt: "2026-11-04T08:00",
      }).success,
    ).toBe(false);
    expect(
      auctionFormSchema.safeParse({
        ...input,
        officialUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(() =>
      auctionFormSchema.safeParse({ ...input, officialUrl: "https://[" }),
    ).not.toThrow();
    expect(
      auctionFormSchema.safeParse({
        ...input,
        proposalStartsAt: "2026-02-31T08:00",
      }).success,
    ).toBe(false);
  });
});
