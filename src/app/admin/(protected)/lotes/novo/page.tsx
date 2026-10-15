import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { LotForm } from "@/components/admin/lot-form";
import { AdminMain, PageHeader } from "@/components/admin/list-layout";
import type { AdminSearchParams } from "@/lib/admin-list";

export const instant = false;

export default async function NewLotPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  await requireAdmin();
  const [auctions, categories] = await Promise.all([
    prisma.auction.findMany({
      where: { deletedAt: null },
      select: { id: true, officialNumber: true },
      orderBy: { officialNumber: "asc" },
    }),
    prisma.category.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const query = await searchParams;
  const auctionId =
    auctions.find((auction) => auction.id === query.leilao)?.id ?? "";
  return (
    <AdminMain>
      <PageHeader title="Novo lote" backHref="/admin/lotes" />
      <LotForm
        id={null}
        auctions={auctions.map((auction) => ({
          id: auction.id,
          label: auction.officialNumber,
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          label: category.name,
        }))}
        initial={{
          version: "",
          auctionId,
          number: "",
          title: "",
          description: "",
          categoryId: "",
          minimumBid: "",
          appraisalValue: "",
          state: "SP",
          city: "",
          storageFacility: "",
          pickupAddress: "",
          officialUrl: "",
          sourceStatus: "",
          participationType: "UNKNOWN",
          publicationStatus: "DRAFT",
          statusOverride: "",
          personalNotes: "",
          items: [{ quantity: "1", unit: "un", description: "" }],
        }}
      />
    </AdminMain>
  );
}
