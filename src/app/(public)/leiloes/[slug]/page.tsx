import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { LotCard } from "@/components/public/lot-card";
import { findPublicAuctionBySlug } from "@/lib/catalog";
import { getAuctionStatus } from "@/lib/auction-status";
import { statusLabels } from "@/lib/admin-display";
import { safeOfficialUrl } from "@/lib/public-links";

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/leiloes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const auction = await findPublicAuctionBySlug(slug);
  if (!auction)
    return {
      title: "Edital não encontrado",
      robots: { index: false, follow: false },
    };
  const description =
    `${auction.officialNumber} · ${auction.unit} · ${auction.lots.length} lotes publicados`.slice(
      0,
      155,
    );
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    title: `Edital ${auction.officialNumber}`,
    description,
    alternates: { canonical: `/leiloes/${auction.slug}` },
    openGraph: {
      type: "website",
      url: new URL(`/leiloes/${auction.slug}`, base).toString(),
      title: auction.title,
      description,
    },
  };
}

async function AuctionContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const auction = await findPublicAuctionBySlug(slug);
  if (!auction) notFound();
  const officialUrl = safeOfficialUrl(auction.officialUrl);
  const noticeUrl = safeOfficialUrl(auction.noticeDocumentUrl);
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 outline-none sm:px-8 sm:py-12"
    >
      <nav
        aria-label="Você está em"
        className="mb-6 text-sm text-muted-foreground"
      >
        <Link
          href="/lotes"
          className="underline-offset-4 hover:text-primary hover:underline"
        >
          Lotes
        </Link>
        <span aria-hidden="true"> / </span>
        <span>Edital {auction.officialNumber}</span>
      </nav>
      <header className="mb-7 border-b pb-7">
        <p className="text-sm font-semibold text-primary">
          Receita Federal do Brasil
        </p>
        <h1 className="mt-2 text-2xl leading-tight font-bold sm:text-3xl">
          {auction.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {auction.unit} · {auction.officialNumber}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-sm bg-muted px-2 py-1 text-xs font-medium">
            {statusLabels[getAuctionStatus(auction)]}
          </span>
          <span className="text-sm text-muted-foreground">
            {auction.lots.length} lotes publicados
          </span>
          {officialUrl && (
            <a
              href={officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2"
            >
              Página oficial
              <ArrowUpRight aria-hidden="true" className="size-4" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          )}
          {noticeUrl && (
            <a
              href={noticeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2"
            >
              Edital oficial
              <ArrowUpRight aria-hidden="true" className="size-4" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          )}
        </div>
      </header>
      <section aria-labelledby="auction-lots-title">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="auction-lots-title" className="text-xl font-semibold">
            Lotes publicados
          </h2>
        </div>
        {auction.lots.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {auction.lots.map((lot) => (
              <LotCard key={lot.id} lot={lot} />
            ))}
          </div>
        ) : (
          <p className="py-10 text-sm text-muted-foreground">
            Este edital ainda não tem lotes publicados nesta curadoria.
          </p>
        )}
      </section>
    </main>
  );
}

export default function AuctionPage({ params }: PageProps<"/leiloes/[slug]">) {
  return (
    <Suspense
      fallback={
        <main
          id="conteudo"
          className="mx-auto flex min-h-96 w-full max-w-6xl items-center gap-3 px-5 sm:px-8"
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-5 animate-spin motion-reduce:animate-none"
          />
          <p role="status">Carregando edital...</p>
        </main>
      }
    >
      <AuctionContent params={params} />
    </Suspense>
  );
}
