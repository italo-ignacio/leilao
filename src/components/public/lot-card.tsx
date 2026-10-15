"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { List, MapPin, X } from "lucide-react";
import { formatBRL } from "@/lib/admin-display";
import { statusLabels } from "@/lib/admin-display";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "./favorite-button";

export type PublicLotCardData = {
  id: string;
  number: number;
  slug: string;
  title: string;
  minimumBid: string;
  items?: { position: number; quantity: string; unit: string; description: string }[];
  state: string;
  city: string;
  status: keyof typeof statusLabels;
  category: { name: string; slug: string };
  images: { storageKey: string; alt: string; width: number | null; height: number | null }[];
  auction: { slug: string; officialNumber: string; title: string; proposalEndsAt: Date | null };
};

export function LotCard({ lot }: { lot: PublicLotCardData }) {
  const image = lot.images[0];
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <article className="min-w-0 overflow-hidden rounded-md border bg-card">
      <Link href={`/lotes/${lot.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <div className="relative aspect-4/3 bg-muted">
          {image ? (
            <Image
              unoptimized
              src={`/api/images/${image.storageKey.split("/").at(-1)}`}
              alt={image.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Imagem indisponível</div>
          )}
        </div>
      </Link>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold text-primary">{lot.category.name} · Lote {lot.number}</p>
            <h2 className="line-clamp-2 min-h-12 text-base font-semibold">
              <Link href={`/lotes/${lot.slug}`} className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2">{lot.title}</Link>
            </h2>
          </div>
          <FavoriteButton slug={lot.slug} label={`Salvar ${lot.title} nos favoritos`} />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">{lot.city}/{lot.state}</span>
        </div>
        {lot.items && (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-start"
            aria-haspopup="dialog"
            aria-label={`Ver ${lot.items.length} mercadorias do lote ${lot.number}`}
            onClick={() => dialog.current?.showModal()}
          >
            <List aria-hidden="true" />
            Ver mercadorias <span className="ml-auto tabular-nums text-muted-foreground">{lot.items.length}</span>
          </Button>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Lance mínimo</p>
            <p className="text-lg font-bold tabular-nums">{formatBRL(lot.minimumBid)}</p>
          </div>
          <span className="rounded-sm bg-muted px-2 py-1 text-xs font-medium">{statusLabels[lot.status]}</span>
        </div>
        <Link href={`/leiloes/${lot.auction.slug}`} className="block truncate rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2">
          Edital {lot.auction.officialNumber}
        </Link>
      </div>
      {lot.items && (
        <dialog
          ref={dialog}
          aria-labelledby={`items-title-${lot.id}`}
          className="m-auto max-h-[min(80dvh,42rem)] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-md border bg-background p-0 text-foreground shadow-xl backdrop:bg-black/50"
          onClick={(event) => {
            if (event.target === dialog.current) dialog.current?.close();
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
            <div className="min-w-0"><p className="text-xs font-semibold text-primary">Lote {lot.number} · {lot.category.name}</p><h2 id={`items-title-${lot.id}`} className="mt-1 text-lg font-semibold">Mercadorias</h2><p className="mt-1 text-sm text-muted-foreground">{lot.title}</p></div>
            <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0" aria-label="Fechar mercadorias" title="Fechar" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></Button>
          </div>
          <ul className="max-h-[calc(min(80dvh,42rem)-6rem)] divide-y overflow-y-auto px-5 sm:px-6">
            {lot.items.map((item) => (
              <li key={item.position} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:gap-5">
                <span className="text-sm tabular-nums text-muted-foreground">{item.quantity.replace(".", ",")} {item.unit}</span>
                <span className="break-words text-sm leading-6">{item.description}</span>
              </li>
            ))}
          </ul>
        </dialog>
      )}
    </article>
  );
}