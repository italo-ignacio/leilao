import { describe, expect, it, vi } from "vitest";
import { Prisma } from "../generated/prisma/client";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./prisma", () => ({ prisma: { lot: { findFirst } } }));

import { findPublicLotBySlug } from "./catalog";

describe("public catalog boundary", () => {
  it("does not query invalid slugs", async () => {
    expect(await findPublicLotBySlug("../admin")).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("excludes drafts, deleted records and inactive categories without selecting personal notes", async () => {
    findFirst.mockResolvedValue(null);
    expect(
      await findPublicLotBySlug("edital-0800100-000014-2026-lote-31"),
    ).toBeNull();
    const query = findFirst.mock.calls[0][0];
    expect(query.where).toEqual({
      slug: "edital-0800100-000014-2026-lote-31",
      deletedAt: null,
      publicationStatus: "PUBLISHED",
      category: { active: true },
      auction: { deletedAt: null, publicationStatus: "PUBLISHED" },
    });
    expect(query.select.personalNotes).toBeUndefined();
    expect(query.select.favorites).toBeUndefined();
    expect(query.select.auction.select).not.toHaveProperty("lots");
  });

  it("serializes money and quantities without floating point conversions", async () => {
    findFirst.mockResolvedValue({
      minimumBid: new Prisma.Decimal("9999999999999999.99"),
      appraisalValue: null,
      statusOverride: null,
      items: [
        {
          quantity: new Prisma.Decimal("0.125"),
          description: "Mercadoria",
          unit: "kg",
        },
      ],
      auction: {
        proposalStartsAt: null,
        proposalEndsAt: null,
        statusOverride: null,
      },
    });
    const lot = await findPublicLotBySlug("lote-teste");
    expect(lot?.minimumBid).toBe("9999999999999999.99");
    expect(lot?.appraisalValue).toBeNull();
    expect(lot?.items[0].quantity).toBe("0.125");
    expect(lot?.status).toBe("UNSCHEDULED");
  });
});
