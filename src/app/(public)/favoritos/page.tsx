import type { Metadata } from "next";
import { FavoritesView } from "@/components/public/favorites-view";

export const metadata: Metadata = {
  title: "Favoritos",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
