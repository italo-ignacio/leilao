import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle, PackageOpen } from "lucide-react";
import type { Metadata } from "next";
import { CatalogFilters } from "@/components/public/catalog-filters";
import { LotCard } from "@/components/public/lot-card";
import { findPublicLots } from "@/lib/catalog";
import type { PublicCatalogSearchParams } from "@/lib/public-catalog-filters";

export const instant = false;
export const metadata: Metadata = {
  title: "Lotes",
  description:
    "Busque lotes publicados na curadoria independente de leilões da Receita Federal.",
  alternates: { canonical: "/lotes" },
};

function queryHref(params: PublicCatalogSearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (key !== "page" && value) query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return suffix ? `/lotes?${suffix}` : "/lotes";
}

async function LotsContent({
  searchParams,
}: {
  searchParams: Promise<PublicCatalogSearchParams>;
}) {
  const params = await searchParams;
  await connection();
  const result = await findPublicLots(params, new Date());
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 outline-none sm:px-8 sm:py-12"
    >
      <header className="pb-6">
        <p className="text-sm font-semibold text-primary">Catálogo público</p>
        <h1 className="mt-2 text-2xl font-bold">Lotes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.total} lotes publicados
        </p>
      </header>
      <CatalogFilters
        filters={result.filters}
        categories={result.categories}
        states={result.states}
      />
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {result.total} resultados · Página {result.page} de {result.pages}
        </p>
        {result.filters.q ||
        result.filters.categoria ||
        result.filters.uf ||
        result.filters.cidade ||
        result.filters.valorMin ||
        result.filters.valorMax ||
        result.filters.status ||
        result.filters.modalidade ||
        result.filters.dataDe ||
        result.filters.dataAte ? (
          <Link
            href="/lotes"
            className="rounded-sm text-sm text-primary underline-offset-4 hover:underline"
          >
            Limpar filtros
          </Link>
        ) : null}
      </div>
      {result.lots.length ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.lots.map((lot) => (
            <LotCard key={lot.id} lot={lot} />
          ))}
        </div>
      ) : (
        <section className="flex min-h-64 flex-col items-center justify-center gap-3 py-10 text-center">
          <PackageOpen
            aria-hidden="true"
            className="size-9 text-muted-foreground"
          />
          <h2 className="text-lg font-semibold">Nenhum lote encontrado</h2>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            {result.total === 0
              ? "Não há lotes publicados no catálogo no momento."
              : "Nenhum lote corresponde aos filtros selecionados."}
          </p>
        </section>
      )}
      {result.pages > 1 && (
        <nav
          aria-label="Paginação dos lotes"
          className="mt-8 flex items-center justify-between border-t pt-5"
        >
          {result.page > 1 ? (
            <a
              href={queryHref(params, result.page - 1)}
              className="inline-flex min-h-10 items-center gap-2 rounded-sm px-2 text-sm font-medium hover:text-primary focus-visible:outline-2"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Anterior
            </a>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            Página {result.page} de {result.pages}
          </span>
          {result.page < result.pages ? (
            <a
              href={queryHref(params, result.page + 1)}
              className="inline-flex min-h-10 items-center gap-2 rounded-sm px-2 text-sm font-medium hover:text-primary focus-visible:outline-2"
            >
              Próxima
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}

export default function LotsPage({ searchParams }: PageProps<"/lotes">) {
  return (
    <Suspense
      fallback={
        <main
          id="conteudo"
          className="mx-auto flex min-h-96 w-full max-w-6xl flex-1 items-center gap-3 px-5 sm:px-8"
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-5 animate-spin motion-reduce:animate-none"
          />
          <p role="status">Carregando lotes...</p>
        </main>
      }
    >
      <LotsContent searchParams={searchParams} />
    </Suspense>
  );
}
