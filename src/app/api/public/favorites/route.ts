import { z } from "zod";
import { findPublicLotsBySlugs } from "@/lib/catalog";

const slugSchema = z.string().max(240).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export async function GET(request: Request) {
  const slugs = new URL(request.url).searchParams.getAll("slug");
  if (slugs.length > 30 || slugs.some((slug) => !slugSchema.safeParse(slug).success)) return Response.json({ error: "Lista de favoritos inválida." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const lots = await findPublicLotsBySlugs(slugs);
  return Response.json(lots, { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}