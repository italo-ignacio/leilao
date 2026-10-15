import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getAdminDashboard } from "@/lib/admin-records";
import { statusLabels } from "@/lib/admin-display";
import { AdminMain, PageHeader } from "@/components/admin/list-layout";

export const instant = false;

export default async function AdminPage() {
  await requireAdmin();
  const summary = await getAdminDashboard(prisma);
  return (
    <AdminMain>
      <PageHeader title="Administração" />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-b pb-8 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["Leilões", summary.auctions],
          ["Propostas abertas", summary.openAuctions],
          ["Lotes", summary.lots],
          ["Encerrando em 7 dias", summary.endingSoon],
          ["Categorias ativas", summary.categories],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="mb-2 text-sm text-muted-foreground">{label}</dt>
            <dd className="text-3xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="status-title" className="py-8">
        <h2 id="status-title" className="mb-5 text-lg font-semibold">
          Lotes por situação
        </h2>
        <div className="divide-y">
          {summary.statuses.map(({ status, count }) => (
            <Link
              key={status}
              href={`/admin/lotes?status=${status}`}
              className="flex items-center justify-between gap-3 px-1 py-4 text-sm hover:text-primary focus-visible:outline-2"
            >
              <span>{statusLabels[status]}</span>
              <span className="font-semibold tabular-nums">{count}</span>
            </Link>
          ))}
        </div>
      </section>
    </AdminMain>
  );
}
