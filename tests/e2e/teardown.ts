import { createDatabaseClient } from "../../src/lib/database";
import { loginRateLimitKey } from "../../src/lib/auth-policy";
import { LocalImageStorage } from "../../src/lib/storage";
import { validateTestDatabaseUrl } from "../../src/lib/test-database-target";
import { join } from "node:path";

export default async function teardown() {
  const url = process.env.TEST_DATABASE_URL;
  const runId = process.env.E2E_RUN_ID;
  const secret = process.env.E2E_AUTH_SECRET;
  const emails = [
    process.env.E2E_ADMIN_EMAIL,
    process.env.E2E_VIEWER_EMAIL,
    process.env.E2E_INACTIVE_EMAIL,
  ];

  if (!url || !runId || !/^[a-f0-9]+$/.test(runId) || !secret) {
    throw new Error("Não foi possível validar o escopo da limpeza E2E.");
  }
  validateTestDatabaseUrl(url, process.env.E2E_ALLOW_REMOTE_DATABASE);
  if (
    emails.some(
      (email, index) =>
        email !==
        `e2e-${["admin", "viewer", "inactive"][index]}-${runId}@example.test`,
    )
  ) {
    throw new Error(
      "Contas E2E não correspondem ao identificador desta execução.",
    );
  }

  const cleanup = createDatabaseClient(url);
  try {
    const prefix = `E2E ${runId} `;
    const auctions = await cleanup.auction.findMany({
      where: { title: { startsWith: prefix } },
      select: { id: true },
    });
    const auctionIds = auctions.map((auction) => auction.id);
    const lotIds = (
      await cleanup.lot.findMany({
        where: { auctionId: { in: auctionIds } },
        select: { id: true },
      })
    ).map((lot) => lot.id);
    const images = await cleanup.lotImage.findMany({
      where: { lotId: { in: lotIds } },
      select: { storageKey: true },
    });
    const storage = new LocalImageStorage(
      join(process.cwd(), "storage", "e2e-uploads"),
    );
    for (const image of images) await storage.remove(image.storageKey);

    await cleanup.$transaction(async (transaction) => {
      await transaction.lotImage.deleteMany({
        where: { lotId: { in: lotIds } },
      });
      await transaction.lotItem.deleteMany({
        where: { lotId: { in: lotIds } },
      });
      await transaction.favorite.deleteMany({
        where: { lotId: { in: lotIds } },
      });
      await transaction.lot.deleteMany({ where: { id: { in: lotIds } } });
      await transaction.auction.deleteMany({
        where: { id: { in: auctionIds } },
      });
      await transaction.category.deleteMany({
        where: { name: { startsWith: prefix } },
      });
      await transaction.user.deleteMany({
        where: { email: { in: emails as string[] } },
      });
      await transaction.loginRateLimit.deleteMany({
        where: {
          key: {
            in: [
              loginRateLimitKey("client", "shared", secret),
              ...emails.map((email) =>
                loginRateLimitKey("account", email!, secret),
              ),
            ],
          },
        },
      });
    });
    console.log("Fixtures E2E desta execução removidas.");
  } finally {
    await cleanup.$disconnect();
  }
}
