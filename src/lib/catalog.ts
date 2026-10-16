import "server-only";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { getAuctionStatus } from "./auction-status";
import type { PublicCatalogFilters } from "./public-catalog-filters";
import {
  BRAZILIAN_STATES,
  clampCatalogPage,
  parsePublicCatalogFilters,
} from "./public-catalog-filters";
import { buildPublicLotWhere, publicLotOrderBy } from "./public-catalog-query";
import { prisma } from "./prisma";

export const PUBLIC_PAGE_SIZE = 12;

const slugSchema = z
  .string()
  .max(240)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const publicLotSelect = {
  id: true,
  number: true,
  slug: true,
  title: true,
  description: true,
  minimumBid: true,
  appraisalValue: true,
  currency: true,
  state: true,
  city: true,
  storageFacility: true,
  pickupAddress: true,
  officialUrl: true,
  sourceStatus: true,
  participationType: true,
  statusOverride: true,
  category: { select: { name: true, slug: true } },
  items: {
    orderBy: { position: "asc" },
    select: { position: true, quantity: true, unit: true, description: true },
  },
  images: {
    orderBy: { position: "asc" },
    select: { storageKey: true, alt: true, width: true, height: true },
  },
  auction: {
    select: {
      slug: true,
      title: true,
      officialNumber: true,
      officialUrl: true,
      mode: true,
      noticeDocumentUrl: true,
      proposalStartsAt: true,
      proposalEndsAt: true,
      classificationAt: true,
      biddingStartsAt: true,
      biddingEndsAt: true,
      statusOverride: true,
    },
  },
} satisfies Prisma.LotSelect;

const publicLotCardSelect = {
  id: true,
  number: true,
  slug: true,
  title: true,
  minimumBid: true,
  state: true,
  city: true,
  statusOverride: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { name: true, slug: true } },
  images: {
    orderBy: { position: "asc" },
    take: 1,
    select: { storageKey: true, alt: true, width: true, height: true },
  },
  auction: {
    select: {
      slug: true,
      officialNumber: true,
      title: true,
      mode: true,
      proposalStartsAt: true,
      proposalEndsAt: true,
      statusOverride: true,
    },
  },
} satisfies Prisma.LotSelect;

const publicLotListSelect = {
  ...publicLotCardSelect,
  items: {
    orderBy: { position: "asc" },
    select: { position: true, quantity: true, unit: true, description: true },
  },
} satisfies Prisma.LotSelect;

type PublicLotCardRow = Prisma.LotGetPayload<{
  select: typeof publicLotCardSelect;
}>;
type PublicLotListRow = Prisma.LotGetPayload<{
  select: typeof publicLotListSelect;
}>;

function serializePublicLotCard(lot: PublicLotCardRow, now: Date) {
  return {
    ...lot,
    minimumBid: lot.minimumBid.toFixed(2),
    status: getAuctionStatus(
      {
        ...lot.auction,
        statusOverride: lot.statusOverride ?? lot.auction.statusOverride,
      },
      now,
    ),
  };
}

function serializePublicLotListItem(lot: PublicLotListRow, now: Date) {
  return {
    ...serializePublicLotCard(lot, now),
    items: lot.items.map((item) => ({
      ...item,
      quantity: item.quantity.toString(),
    })),
  };
}

export async function findPublicLots(
  input: PublicCatalogFilters | unknown,
  now = new Date(),
) {
  const filters = parsePublicCatalogFilters(
    input as Record<string, string | string[] | undefined>,
  );
  const where = buildPublicLotWhere(filters, now);
  const [total, categories] = await Promise.all([
    prisma.lot.count({ where }),
    prisma.category.findMany({
      where: {
        active: true,
        lots: {
          some: {
            deletedAt: null,
            publicationStatus: "PUBLISHED",
            auction: { deletedAt: null, publicationStatus: "PUBLISHED" },
          },
        },
      },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const { page, pages } = clampCatalogPage(filters.page, total);
  const rows = await prisma.lot.findMany({
    where,
    select: publicLotListSelect,
    orderBy: publicLotOrderBy(filters.ordenar),
    take: PUBLIC_PAGE_SIZE,
    skip: (page - 1) * PUBLIC_PAGE_SIZE,
  });
  return {
    filters: { ...filters, page },
    lots: rows.map((lot) => serializePublicLotListItem(lot, now)),
    categories,
    states: BRAZILIAN_STATES,
    total,
    page,
    pages,
  };
}

export async function findPublicHomeHighlights(now = new Date()) {
  const openFilters = parsePublicCatalogFilters({
    status: "OPEN",
    ordenar: "encerrando",
  });
  const latestFilters = parsePublicCatalogFilters({ ordenar: "recentes" });
  const openWhere = buildPublicLotWhere(openFilters, now);
  const latestWhere = buildPublicLotWhere(latestFilters, now);
  const closingBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endingSoonWhere: Prisma.LotWhereInput = {
    ...openWhere,
    auction: {
      deletedAt: null,
      publicationStatus: "PUBLISHED",
      statusOverride: null,
      proposalStartsAt: { lte: now },
      proposalEndsAt: { gt: now, lte: closingBefore },
    },
  };
  const [
    openCount,
    openAuctionCount,
    closingSoonCount,
    publishedCount,
    open,
    closingSoon,
    latest,
  ] = await Promise.all([
    prisma.lot.count({ where: openWhere }),
    prisma.auction.count({
      where: {
        deletedAt: null,
        publicationStatus: "PUBLISHED",
        statusOverride: null,
        proposalStartsAt: { lte: now },
        proposalEndsAt: { gt: now },
        lots: {
          some: {
            deletedAt: null,
            publicationStatus: "PUBLISHED",
            category: { active: true },
          },
        },
      },
    }),
    prisma.lot.count({ where: endingSoonWhere }),
    prisma.lot.count({
      where: {
        deletedAt: null,
        publicationStatus: "PUBLISHED",
        category: { active: true },
        auction: { deletedAt: null, publicationStatus: "PUBLISHED" },
      },
    }),
    prisma.lot.findMany({
      where: openWhere,
      select: publicLotListSelect,
      orderBy: publicLotOrderBy("encerrando"),
      take: 4,
    }),
    prisma.lot.findMany({
      where: endingSoonWhere,
      select: publicLotListSelect,
      orderBy: publicLotOrderBy("encerrando"),
      take: 4,
    }),
    prisma.lot.findMany({
      where: latestWhere,
      select: publicLotListSelect,
      orderBy: publicLotOrderBy("recentes"),
      take: 6,
    }),
  ]);
  return {
    openCount,
    openAuctionCount,
    closingSoonCount,
    publishedCount,
    open: open.map((lot) => serializePublicLotListItem(lot, now)),
    closingSoon: closingSoon.map((lot) => serializePublicLotListItem(lot, now)),
    latest: latest.map((lot) => serializePublicLotListItem(lot, now)),
  };
}

export async function findPublicLotsBySlugs(slugs: string[]) {
  if (slugs.length < 1 || slugs.length > 30) return [];
  const parsed = z.array(slugSchema).max(30).safeParse(slugs);
  if (!parsed.success) return [];
  const rows = await prisma.lot.findMany({
    where: {
      slug: { in: parsed.data },
      deletedAt: null,
      publicationStatus: "PUBLISHED",
      category: { active: true },
      auction: { deletedAt: null, publicationStatus: "PUBLISHED" },
    },
    select: publicLotCardSelect,
  });
  const now = new Date();
  const bySlug = new Map(
    rows.map((lot) => [lot.slug, serializePublicLotCard(lot, now)]),
  );
  return parsed.data.flatMap((entry) => {
    const lot = bySlug.get(entry);
    return lot ? [lot] : [];
  });
}

export async function findPublicAuctionBySlug(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return null;
  const auction = await prisma.auction.findFirst({
    where: {
      slug: parsed.data,
      deletedAt: null,
      publicationStatus: "PUBLISHED",
    },
    select: {
      id: true,
      slug: true,
      officialNumber: true,
      title: true,
      agency: true,
      unit: true,
      mode: true,
      officialUrl: true,
      noticeDocumentUrl: true,
      proposalStartsAt: true,
      proposalEndsAt: true,
      classificationAt: true,
      biddingStartsAt: true,
      biddingEndsAt: true,
      statusOverride: true,
      lots: {
        where: {
          deletedAt: null,
          publicationStatus: "PUBLISHED",
          category: { active: true },
        },
        select: publicLotCardSelect,
        orderBy: { number: "asc" },
      },
    },
  });
  if (!auction) return null;
  return {
    ...auction,
    status: getAuctionStatus(auction),
    lots: auction.lots.map((lot) => serializePublicLotCard(lot, new Date())),
  };
}

export async function getPublicSitemapCounts() {
  const [auctions, lots] = await Promise.all([
    prisma.auction.count({
      where: { deletedAt: null, publicationStatus: "PUBLISHED" },
    }),
    prisma.lot.count({
      where: {
        deletedAt: null,
        publicationStatus: "PUBLISHED",
        category: { active: true },
        auction: { deletedAt: null, publicationStatus: "PUBLISHED" },
      },
    }),
  ]);
  return { auctions, lots };
}

export async function getPublicSitemapChunk(
  start: number,
  take: number,
  auctionCount: number,
) {
  const first = start === 0 ? [{ url: "/" }] : [];
  const auctionStart = Math.max(0, start - 1);
  const auctionEnd = Math.min(auctionCount, Math.max(0, start + take - 1));
  const auctionRows =
    auctionEnd > auctionStart
      ? await prisma.auction.findMany({
          where: { deletedAt: null, publicationStatus: "PUBLISHED" },
          select: { slug: true, updatedAt: true },
          orderBy: { id: "asc" },
          skip: auctionStart,
          take: auctionEnd - auctionStart,
        })
      : [];
  const lotGlobalStart = Math.max(start, 1 + auctionCount);
  const lotStart = lotGlobalStart - (1 + auctionCount);
  const lotEnd = Math.max(lotStart, start + take - (1 + auctionCount));
  const lotRows =
    lotEnd > lotStart
      ? await prisma.lot.findMany({
          where: {
            deletedAt: null,
            publicationStatus: "PUBLISHED",
            category: { active: true },
            auction: { deletedAt: null, publicationStatus: "PUBLISHED" },
          },
          select: { slug: true, updatedAt: true },
          orderBy: { id: "asc" },
          skip: lotStart,
          take: lotEnd - lotStart,
        })
      : [];
  return [
    ...first,
    ...auctionRows.map((auction) => ({
      url: `/leiloes/${auction.slug}`,
      lastModified: auction.updatedAt,
    })),
    ...lotRows.map((lot) => ({
      url: `/lotes/${lot.slug}`,
      lastModified: lot.updatedAt,
    })),
  ];
}

export async function findPublicLotBySlug(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return null;

  const lot = await prisma.lot.findFirst({
    where: {
      slug: parsed.data,
      deletedAt: null,
      publicationStatus: "PUBLISHED",
      category: { active: true },
      auction: { deletedAt: null, publicationStatus: "PUBLISHED" },
    },
    select: publicLotSelect,
  });
  if (!lot) return null;

  return {
    ...lot,
    minimumBid: lot.minimumBid.toFixed(2),
    appraisalValue: lot.appraisalValue?.toFixed(2) ?? null,
    items: lot.items.map((item) => ({
      ...item,
      quantity: item.quantity.toString(),
    })),
    status: getAuctionStatus({
      ...lot.auction,
      statusOverride: lot.statusOverride ?? lot.auction.statusOverride,
    }),
  };
}
