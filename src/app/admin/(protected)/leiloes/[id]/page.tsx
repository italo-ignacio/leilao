import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recordIdSchema, toAdminDate } from "@/lib/admin-schemas";
import { AuctionForm } from "@/components/admin/auction-form";
import { AdminMain, PageHeader } from "@/components/admin/list-layout";
import type { AdminSearchParams } from "@/lib/admin-list";

export const instant = false;

export default async function EditAuctionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  await requireAdmin();
  const parsed = recordIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const auction = await prisma.auction.findFirst({
    where: { id: parsed.data, deletedAt: null },
  });
  if (!auction) notFound();
  const query = await searchParams;
  return (
    <AdminMain>
      <PageHeader
        title="Editar leilão"
        backHref="/admin/leiloes"
        createHref={`/admin/lotes/novo?leilao=${auction.id}`}
        createLabel="Novo lote"
      />
      {query.salvo === "1" && (
        <p role="status" className="mb-5 text-sm text-primary">
          Leilão salvo.
        </p>
      )}
      <AuctionForm
        key={auction.updatedAt.toISOString()}
        id={auction.id}
        initial={{
          version: auction.updatedAt.toISOString(),
          officialNumber: auction.officialNumber,
          title: auction.title,
          agency: auction.agency,
          unit: auction.unit,
          mode: auction.mode,
          officialUrl: auction.officialUrl,
          noticeDocumentUrl: auction.noticeDocumentUrl ?? "",
          publicationStatus: auction.publicationStatus,
          statusOverride: auction.statusOverride ?? "",
          sourceStatus: auction.sourceStatus ?? "",
          proposalStartsAt: toAdminDate(auction.proposalStartsAt),
          proposalEndsAt: toAdminDate(auction.proposalEndsAt),
          classificationAt: toAdminDate(auction.classificationAt),
          biddingStartsAt: toAdminDate(auction.biddingStartsAt),
          biddingEndsAt: toAdminDate(auction.biddingEndsAt),
        }}
      />
    </AdminMain>
  );
}
