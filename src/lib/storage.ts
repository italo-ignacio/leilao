import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { z } from "zod";

export const storageKeySchema = z.string().regex(/^lots\/[a-f0-9-]{36}\.webp$/);

export interface ImageStorage {
  put(key: string, data: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}

export class LocalImageStorage implements ImageStorage {
  constructor(private readonly basePath: string) {}
  private path(key: string) {
    return resolve(this.basePath, storageKeySchema.parse(key));
  }
  async put(key: string, data: Uint8Array) {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data, { flag: "wx", mode: 0o600 });
  }
  async get(key: string) {
    return readFile(this.path(key));
  }
  async remove(key: string) {
    await unlink(this.path(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

class S3ImageStorage implements ImageStorage {
  private readonly client: S3Client;
  constructor(
    private readonly bucket: string,
    endpoint?: string,
    region = "auto",
  ) {
    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      requestHandler: { connectionTimeout: 10_000, requestTimeout: 20_000 },
    });
  }
  async put(key: string, data: Uint8Array) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKeySchema.parse(key),
        Body: data,
        ContentType: "image/webp",
        CacheControl: "private, no-store",
      }),
    );
  }
  async get(key: string) {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKeySchema.parse(key),
      }),
    );
    if (!result.Body) throw new Error("Imagem não disponível.");
    return result.Body.transformToByteArray();
  }
  async remove(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKeySchema.parse(key),
      }),
    );
  }
}

export function getImageStorage(): ImageStorage {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") {
    if (process.env.VERCEL === "1")
      throw new Error("Configure storage S3/R2 na Vercel.");
    const directory = (process.env.STORAGE_LOCAL_PATH ?? "./storage/uploads")
      .replaceAll("\\", "/")
      .replace(/^(?:\.\/)?storage\//, "");
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(directory))
      throw new Error(
        "O storage local deve ficar dentro da pasta storage do projeto.",
      );
    return new LocalImageStorage(join(process.cwd(), "storage", directory));
  }
  if (driver === "s3") {
    const bucket = process.env.STORAGE_S3_BUCKET;
    if (!bucket || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket))
      throw new Error("Configure STORAGE_S3_BUCKET.");
    const endpoint = process.env.STORAGE_S3_ENDPOINT || undefined;
    if (endpoint && new URL(endpoint).protocol !== "https:")
      throw new Error("O endpoint do storage deve usar HTTPS.");
    return new S3ImageStorage(
      bucket,
      endpoint,
      process.env.STORAGE_S3_REGION ?? "auto",
    );
  }
  throw new Error("Driver de storage inválido.");
}
