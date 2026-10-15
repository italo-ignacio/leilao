"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Heart, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { getFavoriteSlugs, getServerFavoriteSlugs, removeUnavailableFavorites, subscribeToFavorites } from "./favorite-store";
import { LotCard, type PublicLotCardData } from "./lot-card";

export function FavoritesView() {
  const slugs = useSyncExternalStore(subscribeToFavorites, getFavoriteSlugs, getServerFavoriteSlugs);
  const key = slugs.join("|");
  const [result, setResult] = useState<{ key: string; lots: PublicLotCardData[] }>({ key: "", lots: [] });
  const loading = key.length > 0 && result.key !== key;
  const lots = result.key === key ? result.lots : [];

  useEffect(() => {
    const controller = new AbortController();
    if (slugs.length === 0) return () => controller.abort();
    const query = new URLSearchParams();
    for (const slug of slugs) query.append("slug", slug);
    fetch(`/api/public/favorites?${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("favorites unavailable");
        return (await response.json()) as PublicLotCardData[];
      })
      .then((result) => {
        setResult({ key, lots: result });
        removeUnavailableFavorites(result.map((lot) => lot.slug));
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") setResult({ key, lots: [] });
      });
    return () => controller.abort();
  }, [key, slugs]);

  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 outline-none sm:px-8 sm:py-12">
      <header className="mb-8 border-b pb-6"><p className="text-sm font-semibold text-primary">Neste dispositivo</p><h1 className="mt-2 text-2xl font-bold">Favoritos</h1><p className="mt-2 text-sm text-muted-foreground">{lots.length} lotes salvos</p></header>
      {loading ? <p role="status" className="flex items-center gap-3 py-12 text-sm text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />Atualizando favoritos...</p> : lots.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{lots.map((lot) => <LotCard key={lot.id} lot={lot} />)}</div> : <section className="flex min-h-64 flex-col items-center justify-center gap-3 py-10 text-center"><Heart aria-hidden="true" className="size-9 text-muted-foreground" /><h2 className="text-lg font-semibold">Nenhum favorito salvo</h2><p className="max-w-sm text-sm leading-6 text-muted-foreground">Os lotes salvos neste navegador aparecem aqui enquanto continuarem publicados.</p><Link href="/lotes" className="mt-2 rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline">Explorar lotes</Link></section>}
    </main>
  );
}