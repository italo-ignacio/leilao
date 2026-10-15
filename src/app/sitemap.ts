import type { MetadataRoute } from "next";
import { getPublicSitemapChunk, getPublicSitemapCounts } from "@/lib/catalog";

const URLS_PER_SITEMAP = 25_000;

export async function generateSitemaps() {
  const counts = await getPublicSitemapCounts();
  const total = 1 + counts.auctions + counts.lots;
  return Array.from(
    { length: Math.max(1, Math.ceil(total / URLS_PER_SITEMAP)) },
    (_, id) => ({ id }),
  );
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const chunk = Number.parseInt(await id, 10);
  if (!Number.isSafeInteger(chunk) || chunk < 0) return [];
  const counts = await getPublicSitemapCounts();
  const entries = await getPublicSitemapChunk(
    chunk * URLS_PER_SITEMAP,
    URLS_PER_SITEMAP,
    counts.auctions,
  );
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return entries.map((entry) => ({
    url: new URL(entry.url, base).toString(),
    changeFrequency: "weekly" as const,
  }));
}
