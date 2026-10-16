import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getImageStorage } from "./storage";

const key = "lots/00000000-0000-0000-0000-000000000001.webp";

describe("MinIO image storage", () => {
  beforeEach(() => {
    vi.stubEnv("STORAGE_DRIVER", "minio");
    vi.stubEnv("MINIO_BLOB_BUCKET", "lot-images");
    vi.stubEnv("MINIO_BLOB_PUBLIC_URL", "https://minio.example.com");
    vi.stubEnv("MINIO_BLOB_ACCESS_KEY", "test-access-key");
    vi.stubEnv("MINIO_BLOB_SECRET_KEY", "test-secret-key");
    vi.stubEnv("STORAGE_S3_REGION", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses MinIO credentials and keeps uploaded objects private", async () => {
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockImplementation((async () => ({})) as S3Client["send"]);
    const storage = getImageStorage();
    const data = Uint8Array.from([1, 2, 3]);
    await storage.put(key, data);

    const client = send.mock.contexts[0] as S3Client;
    expect(client.config.forcePathStyle).toBe(true);
    expect(await client.config.region()).toBe("us-east-1");
    expect(await client.config.credentials()).toMatchObject({
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
    });
    expect((await client.config.endpoint!()).hostname).toBe(
      "minio.example.com",
    );
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: "lot-images",
      Key: key,
      Body: data,
      ContentType: "image/webp",
      CacheControl: "private, no-store",
    });
    expect(command.input).not.toHaveProperty("ACL");
  });

  it("reads and deletes images using the same bucket and storage key", async () => {
    const data = Uint8Array.from([1, 2, 3]);
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockImplementationOnce((async () => ({
        Body: { transformToByteArray: async () => data },
      })) as S3Client["send"])
      .mockImplementationOnce((async () => ({})) as S3Client["send"]);
    const storage = getImageStorage();
    expect(await storage.get(key)).toEqual(data);
    await storage.remove(key);
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[1][0]).toBeInstanceOf(DeleteObjectCommand);
    for (const [command] of send.mock.calls)
      expect(command.input).toEqual({ Bucket: "lot-images", Key: key });
  });

  it.each([
    ["MINIO_BLOB_BUCKET", ""],
    ["MINIO_BLOB_PUBLIC_URL", ""],
    ["MINIO_BLOB_PUBLIC_URL", "http://minio.example.com"],
    ["MINIO_BLOB_PUBLIC_URL", "https://minio.example.com/lot-images"],
    ["MINIO_BLOB_ACCESS_KEY", ""],
    ["MINIO_BLOB_SECRET_KEY", ""],
  ])("rejects invalid configuration for %s", (name, value) => {
    vi.stubEnv(name, value);
    expect(() => getImageStorage()).toThrow();
  });
});
