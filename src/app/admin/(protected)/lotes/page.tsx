import { Pencil } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  ADMIN_PAGE_SIZE,
  parseAdminFilters,
  type AdminSearchParams,
} from "@/lib/admin-list";
import { getAuctionStatus } from "@/lib/auction-status";
import { lotStatusWhere } from "@/lib/admin-records";
import { formatBRL, statusLabels } from "@/lib/admin-display";
import { RecordControls } from "@/components/admin/record-controls";
import {
  AdminMain,
  ListFilters,
  ListPagination,
  PageHeader,
  tableClass,
} from "@/components/admin/list-layout";

export const instant = false;

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  await requireAdmin();
  const filters = parseAdminFilters(await searchParams);
  const where: Prisma.LotWhereInput = {
    AND: [
      {
        deletedAt:
          filters.estado === "todos"
            ? undefined
            : filters.estado === "arquivados"
              ? { not: null }
              : null,
      },
      ...(filters.status
        ? [{ ...lotStatusWhere(filters.status), deletedAt: undefined }]
        : []),
      ...(filters.q
        ? [
            {
              OR: [
                {
                  title: { contains: filters.q, mode: "insensitive" as const },
                },
                { city: { contains: filters.q, mode: "insensitive" as const } },
                {
                  auction: {
                    officialNumber: {
                      contains: filters.q,
                      mode: "insensitive" as const,
                    },
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };
  const total = await prisma.lot.count({ where });
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const lots = await prisma.lot.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: ADMIN_PAGE_SIZE,
    skip: (page - 1) * ADMIN_PAGE_SIZE,
    include: {
      auction: {
        select: {
          officialNumber: true,
          deletedAt: true,
          proposalStartsAt: true,
          proposalEndsAt: true,
          statusOverride: true,
        },
      },
      category: { select: { name: true } },
    },
  });
  return (
    <AdminMain>
      <PageHeader
        title="Lotes"
        createHref="/admin/lotes/novo"
        createLabel="Novo lote"
      />
      <ListFilters path="/admin/lotes" filters={filters} showStatus />
      <div className="overflow-x-auto rounded-md border">
        <table className={tableClass}>
          <caption className="sr-only">Lotes cadastrados</caption>
          <thead>
            <tr>
              <th>Lote / edital</th>
              <th>Título / categoria</th>
              <th>Localização</th>
              <th>Preço mínimo</th>
              <th>Publicação / situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr key={lot.id}>
                <td>
                  <span className="block font-medium">Lote {lot.number}</span>
                  <span className="text-xs text-muted-foreground">
                    {lot.auction.officialNumber}
                  </span>
                </td>
                <td>
                  <span className="block max-w-xs font-medium">
                    {lot.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lot.category.name}
                  </span>
                </td>
                <td>
                  {lot.city}/{lot.state}
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {formatBRL(lot.minimumBid.toFixed(2))}
                </td>
                <td>
                  <span className="block">
                    {lot.deletedAt
                      ? "Arquivado"
                      : lot.auction.deletedAt
                        ? "Edital arquivado"
                        : lot.publicationStatus === "PUBLISHED"
                          ? "Publicado"
                          : "Rascunho"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {
                      statusLabels[
                        getAuctionStatus({
                          ...lot.auction,
                          statusOverride:
                            lot.statusOverride ?? lot.auction.statusOverride,
                        })
                      ]
                    }
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    {!lot.deletedAt && !lot.auction.deletedAt && (
                      <a
                        href={`/admin/lotes/${lot.id}`}
                        aria-label={`Editar lote ${lot.number} do edital ${lot.auction.officialNumber}`}
                        title="Editar lote"
                        className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </a>
                    )}
                    <RecordControls
                      kind="lot"
                      id={lot.id}
                      version={lot.updatedAt.toISOString()}
                      archived={Boolean(lot.deletedAt)}
                      disabled={Boolean(lot.auction.deletedAt)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {!lots.length && (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhum lote encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ListPagination
        path="/admin/lotes"
        filters={filters}
        page={page}
        pages={pages}
        total={total}
      />
    </AdminMain>
  );
}
