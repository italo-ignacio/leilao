import type { MetadataRoute } from "next";
import { getPublicSitemapCounts } from "@/lib/catalog";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const counts = await getPublicSitemapCounts();
  const sitemapCount = Math.max(
    1,
    Math.ceil((1 + counts.auctions + counts.lots) / 25_000),
  );
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/"],
    },
    sitemap: Array.from({ length: sitemapCount }, (_, id) =>
      new URL(`/sitemap/${id}.xml`, base).toString(),
    ),
  };
}
