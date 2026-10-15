import { Prisma, type PrismaClient } from "../generated/prisma/client";
import { curationSchema, toSlug } from "./curation";

export async function importCuration(client: PrismaClient, input: unknown) {
  const data = curationSchema.parse(input);

  return client.$transaction(
    async (transaction) => {
      const result = {
        auctionsCreated: 0,
        auctionsExisting: 0,
        lotsCreated: 0,
        lotsExisting: 0,
        itemsCreated: 0,
      };

      for (const sourceAuction of data.auctions) {
        const auctionSlug = toSlug(`edital-${sourceAuction.officialNumber}`);
        let auction = await transaction.auction.findUnique({
          where: { officialNumber: sourceAuction.officialNumber },
        });

        if (auction) {
          if (
            auction.deletedAt ||
            auction.officialUrl !== sourceAuction.officialUrl
          ) {
            throw new Error(
              "Edital existente excluído ou com URL divergente. Revise-o manualmente.",
            );
          }
          result.auctionsExisting++;
        } else {
          auction = await transaction.auction.create({
            data: {
              officialNumber: sourceAuction.officialNumber,
              slug: auctionSlug,
              title: `Edital ${sourceAuction.officialNumber}`,
              agency: sourceAuction.agency,
              unit: sourceAuction.unit,
              officialUrl: sourceAuction.officialUrl,
              noticeDocumentUrl: sourceAuction.noticeDocumentUrl,
              sourceStatus: sourceAuction.sourceStatus,
            },
          });
          result.auctionsCreated++;
        }

        for (const sourceLot of sourceAuction.lots) {
          const existing = await transaction.lot.findUnique({
            where: {
              auctionId_number: {
                auctionId: auction.id,
                number: sourceLot.number,
              },
            },
          });
          if (existing) {
            if (
              existing.deletedAt ||
              existing.officialUrl !== sourceLot.officialUrl
            ) {
              throw new Error(
                "Lote existente excluído ou com URL divergente. Revise-o manualmente.",
              );
            }
            result.lotsExisting++;
            continue;
          }

          const category = await transaction.category.upsert({
            where: { slug: toSlug(sourceLot.category) },
            update: {},
            create: {
              name: sourceLot.category,
              slug: toSlug(sourceLot.category),
            },
          });
          if (!category.active)
            throw new Error("A categoria do lote está inativa.");

          await transaction.lot.create({
            data: {
              auctionId: auction.id,
              number: sourceLot.number,
              slug: `${auctionSlug}-lote-${sourceLot.number}`,
              title: sourceLot.title,
              description: sourceLot.items
                .map(
                  (item) =>
                    `${item.quantity} ${item.unit} - ${item.description}`,
                )
                .join("\n"),
              categoryId: category.id,
              minimumBid: new Prisma.Decimal(sourceLot.minimumBid),
              appraisalValue:
                sourceLot.appraisalValue === null
                  ? null
                  : new Prisma.Decimal(sourceLot.appraisalValue),
              currency: sourceLot.currency,
              state: sourceLot.state,
              city: sourceLot.city,
              storageFacility: sourceLot.storageFacility,
              pickupAddress: sourceLot.pickupAddress,
              officialUrl: sourceLot.officialUrl,
              sourceStatus: sourceLot.sourceStatus,
              sourceParticipationIconUrl: sourceLot.sourceParticipationIconUrl,
              items: {
                createMany: {
                  data: sourceLot.items.map((item, position) => ({
                    position,
                    quantity: new Prisma.Decimal(String(item.quantity)),
                    unit: item.unit,
                    description: item.description,
                  })),
                },
              },
            },
          });
          result.lotsCreated++;
          result.itemsCreated += sourceLot.items.length;
        }
      }

      return result;
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
}
