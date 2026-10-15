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
import { statusLabels } from "@/lib/admin-display";
import { RecordControls } from "@/components/admin/record-controls";
import {
  AdminMain,
  ListFilters,
  ListPagination,
  PageHeader,
  tableClass,
} from "@/components/admin/list-layout";

export const instant = false;

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  await requireAdmin();
  const filters = parseAdminFilters(await searchParams);
  const where: Prisma.AuctionWhereInput = {
    deletedAt:
      filters.estado === "todos"
        ? undefined
        : filters.estado === "arquivados"
          ? { not: null }
          : null,
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" } },
            { officialNumber: { contains: filters.q, mode: "insensitive" } },
            { unit: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const total = await prisma.auction.count({ where });
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const auctions = await prisma.auction.findMany({
    where,
    skip: (page - 1) * ADMIN_PAGE_SIZE,
    take: ADMIN_PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: { _count: { select: { lots: { where: { deletedAt: null } } } } },
  });
  return (
    <AdminMain>
      <PageHeader
        title="Leilões"
        createHref="/admin/leiloes/novo"
        createLabel="Novo leilão"
      />
      <ListFilters path="/admin/leiloes" filters={filters} />
      <div className="overflow-x-auto rounded-md border">
        <table className={tableClass}>
          <caption className="sr-only">Leilões cadastrados</caption>
          <thead>
            <tr>
              <th>Edital</th>
              <th>Título / unidade</th>
              <th>Publicação</th>
              <th>Situação</th>
              <th>Lotes</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((auction) => (
              <tr key={auction.id}>
                <td className="whitespace-nowrap">{auction.officialNumber}</td>
                <td>
                  <span className="block max-w-xs font-medium">
                    {auction.title}
                  </span>
                  <span className="mt-1 block max-w-xs text-xs text-muted-foreground">
                    {auction.unit}
                  </span>
                </td>
                <td>
                  {auction.deletedAt
                    ? "Arquivado"
                    : auction.publicationStatus === "PUBLISHED"
                      ? "Publicado"
                      : "Rascunho"}
                </td>
                <td>{statusLabels[getAuctionStatus(auction)]}</td>
                <td>{auction._count.lots}</td>
                <td>
                  <div className="flex items-center gap-1">
                    {!auction.deletedAt && (
                      <a
                        href={`/admin/leiloes/${auction.id}`}
                        title="Editar leilão"
                        aria-label={`Editar leilão ${auction.officialNumber}`}
                        className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </a>
                    )}
                    <RecordControls
                      kind="auction"
                      id={auction.id}
                      version={auction.updatedAt.toISOString()}
                      archived={Boolean(auction.deletedAt)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {!auctions.length && (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhum leilão encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ListPagination
        path="/admin/leiloes"
        filters={filters}
        page={page}
        pages={pages}
        total={total}
      />
    </AdminMain>
  );
}
