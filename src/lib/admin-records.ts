import { Prisma, type PrismaClient } from "../generated/prisma/client";
import {
  auctionFormSchema,
  categoryFormSchema,
  lotFormSchema,
  normalizeDecimalInput,
  parseAdminDate,
  recordIdSchema,
  recordMutationSchema,
} from "./admin-schemas";
import { toSlug } from "./curation";
import type { AuctionStatus } from "./auction-status";

export class AdminMutationError extends Error {}

export async function saveAuction(
  client: PrismaClient,
  id: string | null,
  input: unknown,
) {
  const values = auctionFormSchema.parse(input);
  if (id) recordIdSchema.parse(id);
  if (id && !values.version)
    throw new AdminMutationError("Atualize o registro antes de salvar.");
  const data = {
    officialNumber: values.officialNumber,
    title: values.title,
    agency: values.agency,
    unit: values.unit,
    mode: values.mode,
    officialUrl: values.officialUrl,
    noticeDocumentUrl: values.noticeDocumentUrl || null,
    publicationStatus: values.publicationStatus,
    statusOverride: values.statusOverride || null,
    sourceStatus: values.sourceStatus || null,
    proposalStartsAt: parseAdminDate(values.proposalStartsAt),
    proposalEndsAt: parseAdminDate(values.proposalEndsAt),
    classificationAt: parseAdminDate(values.classificationAt),
    biddingStartsAt: parseAdminDate(values.biddingStartsAt),
    biddingEndsAt: parseAdminDate(values.biddingEndsAt),
  };
  if (id)
    return client.auction.update({
      where: { id, updatedAt: new Date(values.version), deletedAt: null },
      data,
      select: { id: true },
    });
  return client.auction.create({
    data: { ...data, slug: toSlug(`edital-${values.officialNumber}`) },
    select: { id: true },
  });
}

export async function saveCategory(
  client: PrismaClient,
  id: string | null,
  input: unknown,
) {
  const values = categoryFormSchema.parse(input);
  if (id) {
    recordIdSchema.parse(id);
    if (!values.version)
      throw new AdminMutationError("Atualize o registro antes de salvar.");
    return client.category.update({
      where: { id, updatedAt: new Date(values.version) },
      data: { name: values.name, active: values.active },
      select: { id: true },
    });
  }
  return client.category.create({
    data: {
      name: values.name,
      slug: toSlug(values.name),
      active: values.active,
    },
    select: { id: true },
  });
}

export async function saveLot(
  client: PrismaClient,
  id: string | null,
  input: unknown,
) {
  const values = lotFormSchema.parse(input);
  if (id) recordIdSchema.parse(id);
  if (id && !values.version)
    throw new AdminMutationError("Atualize o registro antes de salvar.");

  return client.$transaction(async (transaction) => {
    const auction = await transaction.auction.findFirst({
      where: { id: values.auctionId, deletedAt: null },
      select: { id: true, slug: true },
    });
    const category = await transaction.category.findUnique({
      where: { id: values.categoryId },
      select: { id: true, active: true },
    });
    if (!auction || !category)
      throw new AdminMutationError(
        "Selecione um edital disponível e uma categoria válida.",
      );
    if (!category.active && values.publicationStatus === "PUBLISHED")
      throw new AdminMutationError(
        "A categoria deve estar ativa para publicar o lote.",
      );
    const items = values.items.map((item, position) => ({
      position,
      quantity: new Prisma.Decimal(normalizeDecimalInput(item.quantity, 3, 11)),
      unit: item.unit,
      description: item.description,
    }));
    const data = {
      auctionId: auction.id,
      number: Number(values.number),
      title: values.title,
      description: values.description,
      categoryId: category.id,
      minimumBid: new Prisma.Decimal(normalizeDecimalInput(values.minimumBid)),
      appraisalValue: values.appraisalValue
        ? new Prisma.Decimal(normalizeDecimalInput(values.appraisalValue))
        : null,
      state: values.state,
      city: values.city,
      storageFacility: values.storageFacility,
      pickupAddress: values.pickupAddress || null,
      officialUrl: values.officialUrl,
      sourceStatus: values.sourceStatus || null,
      participationType: values.participationType,
      publicationStatus: values.publicationStatus,
      statusOverride: values.statusOverride || null,
      personalNotes: values.personalNotes || null,
    };
    if (id)
      return transaction.lot.update({
        where: { id, updatedAt: new Date(values.version), deletedAt: null },
        data: {
          ...data,
          items: { deleteMany: {}, createMany: { data: items } },
        },
        select: { id: true },
      });
    return transaction.lot.create({
      data: {
        ...data,
        slug: `${auction.slug}-lote-${values.number}`,
        items: { createMany: { data: items } },
      },
      select: { id: true },
    });
  });
}

export async function mutateAdminRecord(
  client: PrismaClient,
  type: "auction" | "lot" | "category",
  input: unknown,
) {
  const values = recordMutationSchema.parse(input);
  const where = { id: values.id, updatedAt: new Date(values.version) };
  if (type === "category") {
    if (values.operation === "delete")
      return client.category.delete({ where, select: { id: true } });
    return client.category.update({
      where,
      data: { active: values.operation === "restore" },
      select: { id: true },
    });
  }
  if (values.operation === "delete")
    throw new AdminMutationError("Leilões e lotes só podem ser arquivados.");
  const deletedAt = values.operation === "archive" ? new Date() : null;
  const currentDeletion = values.operation === "archive" ? null : { not: null };
  if (type === "auction")
    return client.auction.update({
      where: { ...where, deletedAt: currentDeletion },
      data: { deletedAt },
      select: { id: true },
    });
  if (values.operation === "restore") {
    const lot = await client.lot.findFirst({
      where: { id: values.id, auction: { deletedAt: null } },
      select: { id: true },
    });
    if (!lot)
      throw new AdminMutationError(
        "Restaure o edital antes de restaurar o lote.",
      );
  }
  return client.lot.update({
    where: { ...where, deletedAt: currentDeletion },
    data: { deletedAt },
    select: { id: true },
  });
}

export function lotStatusWhere(
  status: AuctionStatus,
  now = new Date(),
): Prisma.LotWhereInput {
  const base = { deletedAt: null, auction: { deletedAt: null } };
  if (status === "SUSPENDED" || status === "CANCELLED")
    return {
      ...base,
      OR: [
        { statusOverride: status },
        {
          statusOverride: null,
          auction: { deletedAt: null, statusOverride: status },
        },
      ],
    };
  const schedule: Prisma.AuctionWhereInput = {
    deletedAt: null,
    statusOverride: null,
  };
  if (status === "UNSCHEDULED")
    schedule.OR = [{ proposalStartsAt: null }, { proposalEndsAt: null }];
  if (status === "SCHEDULED") {
    schedule.proposalStartsAt = { gt: now };
    schedule.proposalEndsAt = { not: null };
  }
  if (status === "OPEN") {
    schedule.proposalStartsAt = { lte: now };
    schedule.proposalEndsAt = { gt: now };
  }
  if (status === "CLOSED") {
    schedule.proposalStartsAt = { not: null };
    schedule.proposalEndsAt = { lte: now };
  }
  return { deletedAt: null, statusOverride: null, auction: schedule };
}

export async function getAdminDashboard(client: PrismaClient) {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const statuses: AuctionStatus[] = [
    "UNSCHEDULED",
    "SCHEDULED",
    "OPEN",
    "CLOSED",
    "SUSPENDED",
    "CANCELLED",
  ];
  const [auctions, openAuctions, lots, categories, endingSoon, ...counts] =
    await Promise.all([
      client.auction.count({ where: { deletedAt: null } }),
      client.auction.count({
        where: {
          deletedAt: null,
          statusOverride: null,
          proposalStartsAt: { lte: now },
          proposalEndsAt: { gt: now },
        },
      }),
      client.lot.count({
        where: { deletedAt: null, auction: { deletedAt: null } },
      }),
      client.category.count({ where: { active: true } }),
      client.lot.count({
        where: {
          deletedAt: null,
          statusOverride: null,
          auction: {
            deletedAt: null,
            statusOverride: null,
            proposalStartsAt: { not: null },
            proposalEndsAt: { gt: now, lte: end },
          },
        },
      }),
      ...statuses.map((status) =>
        client.lot.count({ where: lotStatusWhere(status, now) }),
      ),
    ]);
  return {
    auctions,
    openAuctions,
    lots,
    categories,
    endingSoon,
    statuses: statuses.map((status, index) => ({
      status,
      count: counts[index],
    })),
  };
}
