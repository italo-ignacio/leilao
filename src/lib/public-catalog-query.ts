import { Prisma } from "../generated/prisma/client";
import type { AuctionStatus } from "./auction-status";
import type { PublicCatalogFilters } from "./public-catalog-filters";
import { dateRangeBounds } from "./public-catalog-filters";

export function buildPublicLotWhere(
  filters: PublicCatalogFilters,
  now = new Date(),
): Prisma.LotWhereInput {
  const auction: Prisma.AuctionWhereInput = {
    deletedAt: null,
    publicationStatus: "PUBLISHED",
    ...(filters.modalidade ? { mode: filters.modalidade } : {}),
  };
  const bounds = dateRangeBounds(filters);
  if (bounds.gte || bounds.lt) {
    auction.proposalEndsAt = {
      ...(bounds.gte ? { gte: bounds.gte } : {}),
      ...(bounds.lt ? { lt: bounds.lt } : {}),
    };
  }

  const where: Prisma.LotWhereInput = {
    deletedAt: null,
    publicationStatus: "PUBLISHED",
    category: {
      active: true,
      ...(filters.categoria ? { slug: filters.categoria } : {}),
    },
    auction,
    ...(filters.uf ? { state: filters.uf } : {}),
    ...(filters.cidade
      ? { city: { contains: filters.cidade, mode: "insensitive" } }
      : {}),
  };

  if (filters.valorMin || filters.valorMax) {
    where.minimumBid = {
      ...(filters.valorMin
        ? { gte: new Prisma.Decimal(filters.valorMin) }
        : {}),
      ...(filters.valorMax
        ? { lte: new Prisma.Decimal(filters.valorMax) }
        : {}),
    };
  }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { city: { contains: filters.q, mode: "insensitive" } },
      {
        category: {
          name: { contains: filters.q, mode: "insensitive" },
          active: true,
        },
      },
      {
        items: {
          some: { description: { contains: filters.q, mode: "insensitive" } },
        },
      },
      {
        auction: {
          officialNumber: { contains: filters.q, mode: "insensitive" },
          deletedAt: null,
          publicationStatus: "PUBLISHED",
        },
      },
    ];
  }

  if (filters.status) {
    const status = buildLotStatusWhere(filters.status, now);
    where.AND = Array.isArray(where.AND) ? [...where.AND, status] : [status];
  }

  return where;
}

export function buildLotStatusWhere(
  status: AuctionStatus,
  now = new Date(),
): Prisma.LotWhereInput {
  if (status === "SUSPENDED" || status === "CANCELLED") {
    return {
      OR: [
        { statusOverride: status },
        { statusOverride: null, auction: { statusOverride: status } },
      ],
    };
  }

  const noOverrides: Prisma.LotWhereInput = {
    statusOverride: null,
    auction: { statusOverride: null },
  };
  if (status === "UNSCHEDULED") {
    return {
      AND: [
        noOverrides,
        {
          OR: [
            { auction: { proposalStartsAt: null } },
            { auction: { proposalEndsAt: null } },
          ],
        },
      ],
    };
  }
  if (status === "SCHEDULED") {
    return {
      AND: [
        noOverrides,
        {
          auction: {
            proposalStartsAt: { gt: now },
            proposalEndsAt: { not: null },
          },
        },
      ],
    };
  }
  if (status === "OPEN") {
    return {
      AND: [
        noOverrides,
        {
          auction: {
            proposalStartsAt: { lte: now },
            proposalEndsAt: { gt: now },
          },
        },
      ],
    };
  }
  return {
    AND: [
      noOverrides,
      {
        auction: {
          proposalStartsAt: { not: null },
          proposalEndsAt: { lte: now },
        },
      },
    ],
  };
}

export function publicLotOrderBy(
  order: PublicCatalogFilters["ordenar"],
): Prisma.LotOrderByWithRelationInput[] {
  switch (order) {
    case "preco-menor":
      return [{ minimumBid: "asc" }, { id: "asc" }];
    case "preco-maior":
      return [{ minimumBid: "desc" }, { id: "asc" }];
    case "encerrando":
      return [
        { auction: { proposalEndsAt: { sort: "asc", nulls: "last" } } },
        { id: "asc" },
      ];
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}
