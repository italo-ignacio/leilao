import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recordIdSchema } from "@/lib/admin-schemas";
import { LotForm } from "@/components/admin/lot-form";
import { ImageUploader } from "@/components/admin/image-uploader";
import { AdminMain, PageHeader } from "@/components/admin/list-layout";
import type { AdminSearchParams } from "@/lib/admin-list";

export const instant = false;

export default async function EditLotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<AdminSearchParams>;
}) {
  await requireAdmin();
  const parsed = recordIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const lot = await prisma.lot.findFirst({
    where: { id: parsed.data, deletedAt: null, auction: { deletedAt: null } },
    include: {
      items: { orderBy: { position: "asc" } },
      images: { orderBy: { position: "asc" } },
    },
  });
  if (!lot) notFound();
  const [auctions, categories] = await Promise.all([
    prisma.auction.findMany({
      where: { deletedAt: null },
      select: { id: true, officialNumber: true },
      orderBy: { officialNumber: "asc" },
    }),
    prisma.category.findMany({
      where: { OR: [{ active: true }, { id: lot.categoryId }] },
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const query = await searchParams;
  return (
    <AdminMain>
      <PageHeader title={`Editar lote ${lot.number}`} backHref="/admin/lotes" />
      {query.salvo === "1" && (
        <p role="status" className="mb-5 text-sm text-primary">
          Lote salvo.
        </p>
      )}
      <LotForm
        key={lot.updatedAt.toISOString()}
        id={lot.id}
        auctions={auctions.map((auction) => ({
          id: auction.id,
          label: auction.officialNumber,
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          label: category.active ? category.name : `${category.name} (inativa)`,
        }))}
        initial={{
          version: lot.updatedAt.toISOString(),
          auctionId: lot.auctionId,
          number: String(lot.number),
          title: lot.title,
          description: lot.description,
          categoryId: lot.categoryId,
          minimumBid: lot.minimumBid.toFixed(2).replace(".", ","),
          appraisalValue:
            lot.appraisalValue?.toFixed(2).replace(".", ",") ?? "",
          state: lot.state as "SP",
          city: lot.city,
          storageFacility: lot.storageFacility,
          pickupAddress: lot.pickupAddress ?? "",
          officialUrl: lot.officialUrl,
          sourceStatus: lot.sourceStatus ?? "",
          participationType: lot.participationType,
          publicationStatus: lot.publicationStatus,
          statusOverride: lot.statusOverride ?? "",
          personalNotes: lot.personalNotes ?? "",
          items: lot.items.map((item) => ({
            quantity: item.quantity.toFixed(3).replace(".", ","),
            unit: item.unit,
            description: item.description,
          })),
        }}
      />
      <ImageUploader
        lotId={lot.id}
        images={lot.images.map((image) => ({
          id: image.id,
          storageKey: image.storageKey,
          alt: image.alt,
          width: image.width,
          height: image.height,
        }))}
      />
    </AdminMain>
  );
}
