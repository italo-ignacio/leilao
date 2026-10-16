import { File } from "node:buffer";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import * as undici from "undici";
import { Response } from "undici";
import { describe, expect, it, vi } from "vitest";
import {
  downloadPublicLotImage,
  lookupPublicImageAddress,
  MAX_IMAGE_BYTES,
  prepareImage,
  publicLotImageUrlSchema,
} from "./image-uploads";
import { LocalImageStorage, storageKeySchema } from "./storage";

const { dnsLookup } = vi.hoisted(() => ({ dnsLookup: vi.fn() }));
vi.mock("node:dns", () => ({ lookup: dnsLookup }));
vi.mock("undici", async (importOriginal) => {
  const actual = await importOriginal<typeof import("undici")>();
  return { ...actual, fetch: vi.fn() };
});

describe("image uploads", () => {
  it("blocks hostnames resolving to private addresses at connection time", async () => {
    dnsLookup.mockImplementation((_hostname, _options, callback) => {
      callback(null, [{ address: "127.0.0.1", family: 4 }]);
    });
    await expect(
      new Promise<void>((resolve, reject) => {
        lookupPublicImageAddress("images.example.com", {}, (error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
    ).rejects.toThrow("Endereço de rede não permitido.");
    expect(dnsLookup).toHaveBeenCalled();
  });

  it("rejects forged bytes even when served as a binary download", async () => {
    const fetchMock = vi.mocked(undici.fetch).mockResolvedValue(
      new Response("<html>not an image</html>", {
        headers: { "content-type": "application/octet-stream" },
      }),
    );
    try {
      await expect(
        downloadPublicLotImage("https://images.example.com/photo.jpg"),
      ).rejects.toThrow(/imagem compatível/);
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("validates bytes, reencodes WebP and reads through the storage abstraction", async () => {
    const image = await sharp({
      create: { width: 8, height: 6, channels: 3, background: "#12735a" },
    })
      .png()
      .toBuffer();
    const prepared = await prepareImage(
      new File([Uint8Array.from(image)], "arbitrary-name.png", {
        type: "image/png",
      }),
    );
    expect(prepared.key).toMatch(/^lots\/[a-f0-9-]{36}\.webp$/);
    expect(prepared.width).toBe(8);
    expect((await sharp(prepared.data).metadata()).format).toBe("webp");
    const directory = await mkdtemp(join(tmpdir(), "leiloes-images-"));
    const storage = new LocalImageStorage(directory);
    try {
      await storage.put(prepared.key, prepared.data);
      expect(Buffer.from(await storage.get(prepared.key))).toEqual(
        prepared.data,
      );
      await expect(storage.put(prepared.key, prepared.data)).rejects.toThrow();
      await storage.remove(prepared.key);
      await expect(storage.get(prepared.key)).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("rejects forged images and SVG content", async () => {
    await expect(
      prepareImage(
        new File(["not an image"], "fake.jpg", { type: "image/jpeg" }),
      ),
    ).rejects.toThrow();
    await expect(
      prepareImage(new File(["<svg/>"], "fake.svg", { type: "image/svg+xml" })),
    ).rejects.toThrow();
  });
  it("rejects oversized files before reading their contents", async () => {
    await expect(
      prepareImage({
        size: MAX_IMAGE_BYTES + 1,
        type: "image/png",
        arrayBuffer: async () => {
          throw new Error("must not read");
        },
      }),
    ).rejects.toThrow(/5 MB/);
  });
  it("accepts HTTPS image links from public sites, including URLs without extensions", () => {
    expect(
      publicLotImageUrlSchema.safeParse(
        "https://storagegw.estaleiro.serpro.gov.br/sle-pro-publico/arquivos/images/2026/1000100/5/foto_1000100_2026_5_7_550321_913c5fd8aafc5623b18d5ded7ed87a30.jpg",
      ).success,
    ).toBe(true);
    expect(
      publicLotImageUrlSchema.safeParse(
        "https://storagegw.estaleiro.serpro.gov.br/sle-pro-publico/arquivos/images/2026/1000100/5/foto.jpg",
      ).success,
    ).toBe(true);
    expect(
      publicLotImageUrlSchema.safeParse(
        "https://images.example.com/photo?id=123",
      ).success,
    ).toBe(true);
    for (const url of [
      "http://storagegw.estaleiro.serpro.gov.br/sle-pro-publico/arquivos/images/2026/1000100/5/foto.jpg",
      "https://localhost/image.jpg",
      "https://127.0.0.1/image.jpg",
      "https://10.0.0.1/image.jpg",
      "https://169.254.169.254/image.jpg",
      "https://[::1]/image.jpg",
      "https://[::ffff:127.0.0.1]/image.jpg",
      "https://user:password@example.com/image.jpg",
    ]) {
      expect(publicLotImageUrlSchema.safeParse(url).success).toBe(false);
    }
  });
  it("downloads an external image without an extension and validates the bytes", async () => {
    const image = await sharp({
      create: { width: 8, height: 6, channels: 3, background: "#12735a" },
    })
      .jpeg()
      .toBuffer();
    const fetchMock = vi.mocked(undici.fetch).mockResolvedValue(
      new Response(image, {
        headers: { "content-type": "application/octet-stream" },
      }),
    );
    try {
      const file = await downloadPublicLotImage(
        "https://images.example.com/photo?id=123",
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({ redirect: "error" }),
      );
      const prepared = await prepareImage(file);
      expect((await sharp(prepared.data).metadata()).format).toBe("webp");
    } finally {
      fetchMock.mockRestore();
    }
  });
  it("rejects remote responses that are not image content", async () => {
    const fetchMock = vi.mocked(undici.fetch).mockResolvedValue(
      new Response("not an image", {
        headers: { "content-type": "text/html" },
      }),
    );
    try {
      await expect(
        downloadPublicLotImage(
          "https://storagegw.estaleiro.serpro.gov.br/sle-pro-publico/arquivos/images/2026/1000100/5/foto.jpg",
        ),
      ).rejects.toThrow(/imagem compatível/);
    } finally {
      fetchMock.mockRestore();
    }
  });
  it.each([
    "../secret",
    "lots/../../secret.webp",
    "/absolute/image.webp",
    "lots/image.svg",
  ])("rejects unsafe storage keys: %s", (key) => {
    expect(storageKeySchema.safeParse(key).success).toBe(false);
  });
});
