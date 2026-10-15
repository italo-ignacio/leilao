"use client";

import { useState, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isFavorite, subscribeToFavorites, toggleFavorite } from "./favorite-store";

export function FavoriteButton({ slug, label }: { slug: string; label: string }) {
  const favorite = useSyncExternalStore(
    subscribeToFavorites,
    () => isFavorite(slug),
    () => false,
  );
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="shrink-0">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-10"
        aria-label={favorite ? `Remover ${label.replace(/^Salvar /, "").replace(/ nos favoritos$/, "")} dos favoritos` : label}
        aria-pressed={favorite}
        title={favorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
        onClick={() => {
          const saved = toggleFavorite(slug);
          setMessage(saved ? "Adicionado aos favoritos." : "Removido dos favoritos.");
        }}
      >
        <Heart aria-hidden="true" className={favorite ? "fill-current text-primary" : ""} />
      </Button>
      <span className="sr-only" role="status">{message}</span>
    </div>
  );
}