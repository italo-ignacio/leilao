import { randomUUID } from "node:crypto";
import { File } from "node:buffer";
import sharp from "sharp";
import { z } from "zod";
import { Prisma, type PrismaClient } from "../generated/prisma/client";
import { recordIdSchema } from "./admin-schemas";
import type { ImageStorage } from "./storage";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_LOT_IMAGES = 20;
export const MAX_UPLOAD_FILES = 5;
const publicLotImageUrlPattern =
  /^\/sle-pro-publico\/arquivos\/images\/\d{4}\/\d+\/\d+\/[A-Za-z0-9_.-]+\.(?:jpe?g|png|webp)$/i;

export class ImageUploadError extends Error {}
export type UploadFile = Pick<File, "size" | "type" | "arrayBuffer">;

export const publicLotImageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.hostname === "storagegw.estaleiro.serpro.gov.br" &&
        !url.username &&
        !url.password &&
        !url.port &&
        !url.search &&
        !url.hash &&
        publicLotImageUrlPattern.test(url.pathname)
      );
    } catch {
      return false;
    }
  }, "Use o link direto de uma imagem pública do portal de leilões.");

export async function downloadPublicLotImage(
  value: string,
): Promise<UploadFile> {
  const parsed = publicLotImageUrlSchema.safeParse(value);
  if (!parsed.success)
    throw new ImageUploadError(
      "Use o link direto de uma imagem pública do portal de leilões.",
    );

  const url = new URL(parsed.data);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: "image/jpeg,image/png,image/webp" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ImageUploadError("Não foi possível baixar a imagem desse link.");
  }
  if (!response.ok)
    throw new ImageUploadError("O link da imagem não está disponível.");

  const responseType = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  const extension = url.pathname.split(".").at(-1)?.toLowerCase();
  const typeByExtension: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  const type = extension ? typeByExtension[extension] : undefined;
  if (
    !type ||
    !responseType ||
    (responseType !== type && responseType !== "application/octet-stream")
  )
    throw new ImageUploadError("O link não aponta para uma imagem compatível.");
  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength > MAX_IMAGE_BYTES)
    throw new ImageUploadError("Cada imagem deve ter até 5 MB.");
  if (!response.body)
    throw new ImageUploadError("O link não retornou os dados da imagem.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new ImageUploadError("Cada imagem deve ter até 5 MB.");
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError("Não foi possível baixar a imagem desse link.");
  } finally {
    reader.releaseLock();
  }

  return new File([Buffer.concat(chunks)], "imagem-publica", { type });
}

export async function prepareImage(file: UploadFile) {
  if (file.size < 1 || file.size > MAX_IMAGE_BYTES)
    throw new ImageUploadError("Cada imagem deve ter até 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new ImageUploadError("Use imagens JPEG, PNG ou WebP.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length !== file.size)
    throw new ImageUploadError("Arquivo inválido.");
  try {
    const image = sharp(buffer, {
      limitInputPixels: 32_000_000,
      failOn: "error",
      animated: false,
    });
    const metadata = await image.metadata();
    const formats = {
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    if (
      !metadata.format ||
      !(metadata.format in formats) ||
      formats[metadata.format as keyof typeof formats] !== file.type ||
      (metadata.pages ?? 1) > 1
    )
      throw new ImageUploadError("Formato da imagem inválido.");
    const { data, info } = await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > MAX_IMAGE_BYTES)
      throw new ImageUploadError("A imagem processada excede o limite.");
    return {
      key: `lots/${randomUUID()}.webp`,
      data,
      width: info.width,
      height: info.height,
    };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError(
      "Não foi possível validar a imagem. Verifique o arquivo e sua resolução.",
    );
  }
}

export async function readUploadForm(request: Request) {
  if (
    !request.body ||
    !request.headers.get("content-type")?.startsWith("multipart/form-data;")
  )
    throw new ImageUploadError("Envie um formulário de imagens válido.");
  let size = 0;
  const stream = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        size += chunk.byteLength;
        if (size > MAX_UPLOAD_BYTES + 1024 * 1024)
          throw new ImageUploadError("O envio excede 20 MB.");
        controller.enqueue(chunk);
      },
    }),
  );
  return new Response(stream, {
    headers: { "content-type": request.headers.get("content-type")! },
  }).formData();
}

export async function uploadLotImages(
  client: PrismaClient,
  storage: ImageStorage,
  id: string,
  files: UploadFile[],
) {
  recordIdSchema.parse(id);
  if (files.length < 1 || files.length > MAX_UPLOAD_FILES)
    throw new ImageUploadError("Envie de 1 a 5 imagens por vez.");
  if (files.reduce((total, file) => total + file.size, 0) > MAX_UPLOAD_BYTES)
    throw new ImageUploadError("O envio excede 20 MB.");
  const lot = await client.lot.findFirst({
    where: { id, deletedAt: null, auction: { deletedAt: null } },
    select: { id: true, title: true },
  });
  if (!lot) throw new ImageUploadError("Lote indisponível.");
  const prepared: Awaited<ReturnType<typeof prepareImage>>[] = [];
  for (const file of files) prepared.push(await prepareImage(file));
  const stored: string[] = [];
  try {
    for (const image of prepared) {
      await storage.put(image.key, image.data);
      stored.push(image.key);
    }
    await client.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "lots" WHERE "id" = ${id} FOR UPDATE`,
      );
      if (
        !(await transaction.lot.findFirst({
          where: { id, deletedAt: null, auction: { deletedAt: null } },
          select: { id: true },
        }))
      )
        throw new ImageUploadError("Lote indisponível.");
      const images = await transaction.lotImage.aggregate({
        where: { lotId: id },
        _count: true,
        _max: { position: true },
      });
      if (images._count + prepared.length > MAX_LOT_IMAGES)
        throw new ImageUploadError("O lote aceita no máximo 20 imagens.");
      const start = (images._max.position ?? -1) + 1;
      await transaction.lotImage.createMany({
        data: prepared.map((image, index) => ({
          lotId: id,
          storageKey: image.key,
          position: start + index,
          alt: lot.title,
          width: image.width,
          height: image.height,
          mimeType: "image/webp",
        })),
      });
    });
  } catch (error) {
    await Promise.allSettled(stored.map((key) => storage.remove(key)));
    throw error;
  }
  return prepared.length;
}

export const imageMutationSchema = z.discriminatedUnion("operation", [
  z.strictObject({
    operation: z.literal("delete"),
    lotId: recordIdSchema,
    imageId: recordIdSchema,
  }),
  z.strictObject({
    operation: z.literal("alt"),
    lotId: recordIdSchema,
    imageId: recordIdSchema,
    alt: z.string().trim().min(1).max(300),
  }),
  z.strictObject({
    operation: z.literal("order"),
    lotId: recordIdSchema,
    ids: z.array(recordIdSchema).min(1).max(MAX_LOT_IMAGES),
  }),
]);

export async function mutateLotImage(
  client: PrismaClient,
  storage: ImageStorage,
  input: unknown,
) {
  const values = imageMutationSchema.parse(input);
  const key = await client.$transaction(async (transaction) => {
    await transaction.$queryRaw(
      Prisma.sql`SELECT "id" FROM "lots" WHERE "id" = ${values.lotId} FOR UPDATE`,
    );
    if (
      !(await transaction.lot.findFirst({
        where: {
          id: values.lotId,
          deletedAt: null,
          auction: { deletedAt: null },
        },
        select: { id: true },
      }))
    )
      throw new ImageUploadError("Lote indisponível.");
    if (values.operation === "order") {
      const images = await transaction.lotImage.findMany({
        where: { lotId: values.lotId },
        select: { id: true, position: true },
      });
      if (
        images.length !== values.ids.length ||
        new Set(values.ids).size !== images.length ||
        values.ids.some((id) => !images.some((image) => image.id === id))
      )
        throw new ImageUploadError("A galeria mudou. Atualize a página.");
      const offset =
        Math.max(...images.map((image) => image.position)) + images.length + 1;
      await transaction.lotImage.updateMany({
        where: { lotId: values.lotId },
        data: { position: { increment: offset } },
      });
      for (const [position, id] of values.ids.entries())
        await transaction.lotImage.update({
          where: { id },
          data: { position },
        });
      return null;
    }
    const image = await transaction.lotImage.findFirst({
      where: { id: values.imageId, lotId: values.lotId },
    });
    if (!image) throw new ImageUploadError("Imagem indisponível.");
    if (values.operation === "alt") {
      await transaction.lotImage.update({
        where: { id: image.id },
        data: { alt: values.alt },
      });
      return null;
    }
    await transaction.lotImage.delete({ where: { id: image.id } });
    return image.storageKey;
  });
  if (key)
    await storage
      .remove(key)
      .catch(() =>
        console.warn("Arquivo órfão no storage: limpeza posterior necessária."),
      );
}
