"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { getFavoriteSlugs, subscribeToFavorites } from "./favorite-store";

export function FavoriteLink() {
  const count = useSyncExternalStore(subscribeToFavorites, () => getFavoriteSlugs().length, () => 0);
  return (
    <Link href="/favoritos" aria-label={`Favoritos${count ? `, ${count} salvos` : ""}`} className="inline-flex min-h-10 items-center gap-2 rounded-sm px-2 text-sm font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2">
      <Heart aria-hidden="true" className="size-4" />
      <span>Favoritos</span>
      {count > 0 && <span className="tabular-nums text-muted-foreground">{count}</span>}
    </Link>
  );
}