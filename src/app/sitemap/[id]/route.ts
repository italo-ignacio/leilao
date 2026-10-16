import { connection } from "next/server";
import { getPublicSitemapChunk, getPublicSitemapCounts } from "@/lib/catalog";

const URLS_PER_SITEMAP = 25_000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  const { id } = await params;
  if (!/^(0|[1-9]\d*)\.xml$/.test(id))
    return new Response(null, { status: 404 });
  const chunk = Number(id.slice(0, -4));
  if (!Number.isSafeInteger(chunk)) return new Response(null, { status: 404 });
  const counts = await getPublicSitemapCounts();
  if (
    chunk >=
    Math.max(
      1,
      Math.ceil((1 + counts.auctions + counts.lots) / URLS_PER_SITEMAP),
    )
  )
    return new Response(null, { status: 404 });
  const entries = await getPublicSitemapChunk(
    chunk * URLS_PER_SITEMAP,
    URLS_PER_SITEMAP,
    counts.auctions,
  );
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const urls = entries.map((entry) => {
    const url = new URL(entry.url, base)
      .toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
    return `<url><loc>${url}</loc><changefreq>weekly</changefreq></url>`;
  });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
