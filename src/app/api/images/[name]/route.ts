import { getCurrentAdmin } from "@/lib/admin-auth";
import { getImageStorage, storageKeySchema } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const key = storageKeySchema.safeParse(`lots/${(await context.params).name}`);
  if (!key.success) return new Response(null, { status: 404 });
  const image = await prisma.lotImage.findUnique({
    where: { storageKey: key.data },
    select: {
      lot: {
        select: {
          deletedAt: true,
          publicationStatus: true,
          category: { select: { active: true } },
          auction: { select: { deletedAt: true, publicationStatus: true } },
        },
      },
    },
  });
  if (!image || image.lot.deletedAt || image.lot.auction.deletedAt)
    return new Response(null, { status: 404 });
  const published =
    image.lot.publicationStatus === "PUBLISHED" &&
    image.lot.auction.publicationStatus === "PUBLISHED" &&
    image.lot.category.active;
  if (!published && !(await getCurrentAdmin()))
    return new Response(null, { status: 404 });
  try {
    const bytes = await getImageStorage().get(key.data);
    return new Response(Uint8Array.from(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": 'inline; filename="image.webp"',
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
