import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, LoaderCircle, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Countdown } from "@/components/public/countdown";
import { FavoriteButton } from "@/components/public/favorite-button";
import { findPublicLotBySlug } from "@/lib/catalog";
import { formatBRL, statusLabels } from "@/lib/admin-display";
import { safeOfficialUrl } from "@/lib/public-links";

export const instant = false;

function absoluteUrl(path: string) {
  return new URL(
    path,
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ).toString();
}

export async function generateMetadata({
  params,
}: PageProps<"/lotes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lot = await findPublicLotBySlug(slug);
  if (!lot) return { title: "Lote não encontrado" };
  const description = lot.description.replace(/\s+/g, " ").slice(0, 155);
  const image = lot.images[0]
    ? absoluteUrl(`/api/images/${lot.images[0].storageKey.split("/").at(-1)}`)
    : undefined;
  return {
    title: lot.title,
    description,
    alternates: { canonical: `/lotes/${lot.slug}` },
    openGraph: {
      type: "website",
      url: absoluteUrl(`/lotes/${lot.slug}`),
      title: lot.title,
      description,
      images: image
        ? [
            {
              url: image,
              width: lot.images[0].width ?? undefined,
              height: lot.images[0].height ?? undefined,
              alt: lot.images[0].alt,
            },
          ]
        : undefined,
    },
  };
}

function formatDate(value: Date | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

async function LotContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lot = await findPublicLotBySlug(slug);
  if (!lot) notFound();
  const lotOfficialUrl = safeOfficialUrl(lot.officialUrl);
  const auctionOfficialUrl = safeOfficialUrl(lot.auction.officialUrl);
  const noticeUrl = safeOfficialUrl(lot.auction.noticeDocumentUrl);
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 outline-none sm:px-8 sm:py-12"
    >
      <nav
        aria-label="Você está em"
        className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link
          href="/lotes"
          className="underline-offset-4 hover:text-primary hover:underline"
        >
          Lotes
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/leiloes/${lot.auction.slug}`}
          className="underline-offset-4 hover:text-primary hover:underline"
        >
          Edital {lot.auction.officialNumber}
        </Link>
        <span aria-hidden="true">/</span>
        <span>Lote {lot.number}</span>
      </nav>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">
            {lot.category.name} · Lote {lot.number}
          </p>
          <h1 className="mt-2 text-2xl leading-tight font-bold sm:text-3xl">
            {lot.title}
          </h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {lot.city}/{lot.state} · {lot.storageFacility}
          </p>
        </div>
        <FavoriteButton
          slug={lot.slug}
          label={`Salvar ${lot.title} nos favoritos`}
        />
      </header>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-9">
          <section
            aria-label="Galeria de imagens"
            className="grid gap-3 sm:grid-cols-2"
          >
            {lot.images.length ? (
              lot.images.map((image, index) => (
                <figure
                  key={image.storageKey}
                  className="min-w-0 overflow-hidden rounded-md border"
                >
                  <div className="relative aspect-4/3 bg-muted">
                    <Image
                      unoptimized
                      src={`/api/images/${image.storageKey.split("/").at(-1)}`}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      priority={index === 0}
                      className="object-contain"
                    />
                  </div>
                  {image.alt && (
                    <figcaption className="px-3 py-2 text-xs text-muted-foreground">
                      {image.alt}
                    </figcaption>
                  )}
                </figure>
              ))
            ) : (
              <div className="flex aspect-4/3 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
                Sem imagens cadastradas
              </div>
            )}
          </section>
          <section
            aria-labelledby="description-title"
            className="border-t pt-6"
          >
            <h2 id="description-title" className="text-lg font-semibold">
              Descrição
            </h2>
            <p className="mt-3 text-sm leading-7 whitespace-pre-line">
              {lot.description}
            </p>
          </section>
          <section aria-labelledby="items-title" className="border-t pt-6">
            <h2 id="items-title" className="text-lg font-semibold">
              Mercadorias
            </h2>
            <ul className="mt-3 divide-y">
              {lot.items.map((item) => (
                <li
                  key={item.position}
                  className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]"
                >
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {item.quantity.replace(".", ",")} {item.unit}
                  </span>
                  <span className="text-sm leading-6">{item.description}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="pickup-title" className="border-t pt-6">
            <h2 id="pickup-title" className="text-lg font-semibold">
              Retirada
            </h2>
            <p className="mt-3 text-sm leading-6">
              {lot.storageFacility} · {lot.city}/{lot.state}
            </p>
            {lot.pickupAddress && (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {lot.pickupAddress}
              </p>
            )}
          </section>
        </div>
        <aside className="h-fit space-y-6 border-t pt-5 lg:sticky lg:top-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <section aria-labelledby="bid-title">
            <p id="bid-title" className="text-sm text-muted-foreground">
              Preço mínimo
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {formatBRL(lot.minimumBid)}
            </p>
            {lot.appraisalValue && (
              <p className="mt-2 text-sm text-muted-foreground">
                Avaliação: {formatBRL(lot.appraisalValue)}
              </p>
            )}
            <p className="mt-3 inline-flex rounded-sm bg-muted px-2 py-1 text-xs font-medium">
              {statusLabels[lot.status]}
            </p>
          </section>
          <section className="border-t pt-5">
            <h2 className="text-sm font-semibold">Prazo para propostas</h2>
            <div className="mt-2">
              <Countdown
                endsAt={lot.auction.proposalEndsAt?.toISOString() ?? null}
              />
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Início</dt>
                <dd className="mt-1">
                  {formatDate(lot.auction.proposalStartsAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Encerramento</dt>
                <dd className="mt-1">
                  {formatDate(lot.auction.proposalEndsAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sessão para lances</dt>
                <dd className="mt-1">
                  {formatDate(lot.auction.biddingStartsAt)}
                </dd>
              </div>
            </dl>
          </section>
          <section className="border-t pt-5">
            <h2 className="text-sm font-semibold">Edital</h2>
            <p className="mt-2 text-sm">{lot.auction.officialNumber}</p>
            {lotOfficialUrl && (
              <a
                href={lotOfficialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2"
              >
                Página oficial do lote
                <ArrowUpRight aria-hidden="true" className="size-4" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            )}
            {noticeUrl && (
              <a
                href={noticeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex min-h-10 items-center gap-2 rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2"
              >
                Abrir edital oficial
                <ArrowUpRight aria-hidden="true" className="size-4" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            )}
            {auctionOfficialUrl && (
              <a
                href={auctionOfficialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex min-h-10 items-center gap-2 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2"
              >
                Página do leilão
                <ArrowUpRight aria-hidden="true" className="size-4" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

export default function LotDetailPage({ params }: PageProps<"/lotes/[slug]">) {
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
          <p role="status">Carregando lote...</p>
        </main>
      }
    >
      <LotContent params={params} />
    </Suspense>
  );
}
