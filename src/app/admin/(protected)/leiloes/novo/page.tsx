import { requireAdmin } from "@/lib/admin-auth";
import { AuctionForm } from "@/components/admin/auction-form";
import { AdminMain, PageHeader } from "@/components/admin/list-layout";

export const instant = false;

export default async function NewAuctionPage() {
  await requireAdmin();
  return (
    <AdminMain>
      <PageHeader title="Novo leilão" backHref="/admin/leiloes" />
      <AuctionForm
        id={null}
        initial={{
          version: "",
          officialNumber: "",
          title: "",
          agency: "Receita Federal do Brasil",
          unit: "",
          mode: "UNKNOWN",
          officialUrl: "",
          noticeDocumentUrl: "",
          publicationStatus: "DRAFT",
          statusOverride: "",
          sourceStatus: "",
          proposalStartsAt: "",
          proposalEndsAt: "",
          classificationAt: "",
          biddingStartsAt: "",
          biddingEndsAt: "",
        }}
      />
    </AdminMain>
  );
}
