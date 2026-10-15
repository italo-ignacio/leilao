import { describe, expect, it } from "vitest";
import source from "../../data/curated-lots.json";
import { curationSchema, moneySchema, toSlug } from "./curation";

describe("manual curation", () => {
  it("validates all supplied auctions, prices and quantities", () => {
    const data = curationSchema.parse(source);
    expect(data.auctions).toHaveLength(2);
    const lots = data.auctions.flatMap((auction) => auction.lots);
    expect(lots).toHaveLength(8);
    expect(
      lots.reduce(
        (total, lot) =>
          total + lot.items.reduce((count, item) => count + item.quantity, 0),
        0,
      ),
    ).toBe(132);
    expect(
      data.auctions.map((auction) =>
        auction.lots
          .filter((lot) => lot.number === 59)
          .map((lot) => lot.minimumBid),
      ),
    ).toEqual([["824.00"], ["9800.00"]]);
    expect(
      data.auctions[1].lots.find((lot) => lot.number === 59)?.items,
    ).toHaveLength(14);
  });

  it.each([
    2069,
    "2.069,00",
    "-1.00",
    "1.999",
    "1e3",
    "01.00",
    "10000000000000000.00",
  ])("rejects invalid money: %s", (value) => {
    expect(moneySchema.safeParse(value).success).toBe(false);
  });

  it("accepts exact string amounts up to Decimal(18,2)", () => {
    expect(moneySchema.parse("9999999999999999.99")).toBe(
      "9999999999999999.99",
    );
    expect(moneySchema.parse("0.00")).toBe("0.00");
  });

  it("rejects duplicate lots within an auction", () => {
    const data = structuredClone(source);
    data.auctions[0].lots.push(data.auctions[0].lots[0]);
    expect(curationSchema.safeParse(data).success).toBe(false);
  });

  it("rejects duplicate auctions", () => {
    const data = structuredClone(source);
    data.auctions.push(data.auctions[0]);
    expect(curationSchema.safeParse(data).success).toBe(false);
  });

  it("rejects a mismatched lot URL", () => {
    const data = structuredClone(source);
    data.auctions[0].lots[0].officialUrl = data.auctions[1].lots[0].officialUrl;
    expect(curationSchema.safeParse(data).success).toBe(false);
  });

  it("rejects nonofficial hosts and zero quantities", () => {
    const data = structuredClone(source);
    data.auctions[0].officialUrl = "https://example.com/edital";
    expect(curationSchema.safeParse(data).success).toBe(false);
    const invalid = structuredClone(source);
    invalid.auctions[0].lots[0].items[0].quantity = 0;
    expect(curationSchema.safeParse(invalid).success).toBe(false);
  });

  it("creates stable slugs without losing leading zeroes", () => {
    expect(toSlug("INFORMÁTICA")).toBe("informatica");
    expect(toSlug("edital-0800100/000014/2026")).toBe(
      "edital-0800100-000014-2026",
    );
  });
});
