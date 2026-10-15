import { describe, expect, it } from "vitest";
import { Prisma } from "../generated/prisma/client";
import { parsePublicCatalogFilters } from "./public-catalog-filters";
import {
  buildLotStatusWhere,
  buildPublicLotWhere,
  publicLotOrderBy,
} from "./public-catalog-query";

const now = new Date("2026-10-15T12:00:00.000Z");

describe("public catalog query", () => {
  it("always scopes listings to published, active, non-deleted records", () => {
    const where = buildPublicLotWhere(parsePublicCatalogFilters({}));
    expect(where.deletedAt).toBeNull();
    expect(where.publicationStatus).toBe("PUBLISHED");
    expect(where.category).toMatchObject({ active: true });
    expect(where.auction).toMatchObject({
      deletedAt: null,
      publicationStatus: "PUBLISHED",
    });
    expect(where).not.toHaveProperty("personalNotes");
  });

  it("uses Decimal filters and combines text, location, category, mode and dates", () => {
    const filters = parsePublicCatalogFilters({
      q: "switch",
      categoria: "videogame",
      uf: "RS",
      cidade: "Pelotas",
      valorMin: "1000",
      valorMax: "2000",
      modalidade: "ELECTRONIC",
      dataDe: "2026-10-20",
      dataAte: "2026-10-31",
    });
    const where = buildPublicLotWhere(filters, now);
    expect(where.minimumBid).toEqual({
      gte: new Prisma.Decimal("1000.00"),
      lte: new Prisma.Decimal("2000.00"),
    });
    expect(where.category).toMatchObject({ active: true, slug: "videogame" });
    expect(where.state).toBe("RS");
    expect(where.city).toEqual({ contains: "Pelotas", mode: "insensitive" });
    expect(where.auction).toMatchObject({
      mode: "ELECTRONIC",
      proposalEndsAt: {
        gte: new Date("2026-10-20T00:00:00.000Z"),
        lt: new Date("2026-11-01T00:00:00.000Z"),
      },
    });
    expect(where.OR).toHaveLength(6);
  });

  it.each([
    [
      "UNSCHEDULED",
      {
        AND: [
          { statusOverride: null, auction: { statusOverride: null } },
          {
            OR: [
              { auction: { proposalStartsAt: null } },
              { auction: { proposalEndsAt: null } },
            ],
          },
        ],
      },
    ],
    [
      "SCHEDULED",
      {
        AND: [
          { statusOverride: null, auction: { statusOverride: null } },
          {
            auction: {
              proposalStartsAt: { gt: now },
              proposalEndsAt: { not: null },
            },
          },
        ],
      },
    ],
    [
      "OPEN",
      {
        AND: [
          { statusOverride: null, auction: { statusOverride: null } },
          {
            auction: {
              proposalStartsAt: { lte: now },
              proposalEndsAt: { gt: now },
            },
          },
        ],
      },
    ],
    [
      "CLOSED",
      {
        AND: [
          { statusOverride: null, auction: { statusOverride: null } },
          {
            auction: {
              proposalStartsAt: { not: null },
              proposalEndsAt: { lte: now },
            },
          },
        ],
      },
    ],
    [
      "SUSPENDED",
      {
        OR: [
          { statusOverride: "SUSPENDED" },
          { statusOverride: null, auction: { statusOverride: "SUSPENDED" } },
        ],
      },
    ],
    [
      "CANCELLED",
      {
        OR: [
          { statusOverride: "CANCELLED" },
          { statusOverride: null, auction: { statusOverride: "CANCELLED" } },
        ],
      },
    ],
  ] as const)("builds database filters for %s", (status, expected) => {
    expect(buildLotStatusWhere(status, now)).toEqual(expected);
  });

  it("orders every sort with a stable unique tie-breaker", () => {
    expect(publicLotOrderBy("recentes")).toEqual([
      { createdAt: "desc" },
      { id: "asc" },
    ]);
    expect(publicLotOrderBy("preco-menor")).toEqual([
      { minimumBid: "asc" },
      { id: "asc" },
    ]);
    expect(publicLotOrderBy("preco-maior")).toEqual([
      { minimumBid: "desc" },
      { id: "asc" },
    ]);
    expect(publicLotOrderBy("encerrando")).toEqual([
      { auction: { proposalEndsAt: { sort: "asc", nulls: "last" } } },
      { id: "asc" },
    ]);
  });
});
