import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { verify } from "argon2";
import source from "../../data/curated-lots.json";
import { createDatabaseClient } from "../../src/lib/database";
import { importCuration } from "../../src/lib/import-curation";
import { seedDatabase } from "../../src/lib/seed";
import { consumeLoginRateLimit } from "../../src/lib/login-rate-limit";
import {
  ACCOUNT_LOGIN_LIMIT,
  CLIENT_LOGIN_LIMIT,
  loginRateLimitKey,
} from "../../src/lib/auth-policy";
import { findActiveAdmin } from "../../src/lib/auth-service";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (
  !databaseUrl ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(databaseUrl).hostname)
) {
  throw new Error(
    "TEST_DATABASE_URL deve apontar para um banco local com as migrations aplicadas. Azure não é permitido neste teste.",
  );
}
const client = createDatabaseClient(databaseUrl);

try {
  const first = await importCuration(client, source);
  assert.equal(first.lotsCreated + first.lotsExisting, 8);
  const idsBefore = (
    await client.lot.findMany({
      orderBy: { slug: "asc" },
      select: { id: true },
    })
  ).map((lot) => lot.id);
  const second = await importCuration(client, source);
  assert.equal(second.lotsCreated, 0);
  assert.equal(second.auctionsCreated, 0);
  assert.equal(second.lotsExisting, 8);
  assert.equal(second.itemsCreated, 0);
  assert.deepEqual(
    (
      await client.lot.findMany({
        orderBy: { slug: "asc" },
        select: { id: true },
      })
    ).map((lot) => lot.id),
    idsBefore,
  );

  for (const sourceAuction of source.auctions) {
    const auction = await client.auction.findUniqueOrThrow({
      where: { officialNumber: sourceAuction.officialNumber },
      include: {
        lots: { include: { items: { orderBy: { position: "asc" } } } },
      },
    });
    assert.equal(auction.proposalStartsAt, null);
    assert.equal(auction.proposalEndsAt, null);
    assert.equal(auction.publicationStatus, "DRAFT");
    for (const sourceLot of sourceAuction.lots) {
      const lot = auction.lots.find(
        (entry) => entry.number === sourceLot.number,
      );
      assert.ok(lot);
      assert.equal(lot.minimumBid.toFixed(2), sourceLot.minimumBid);
      assert.equal(lot.publicationStatus, "DRAFT");
      assert.deepEqual(
        lot.items.map((item) => ({
          quantity: item.quantity.toNumber(),
          unit: item.unit,
          description: item.description,
        })),
        sourceLot.items,
      );
    }
  }

  const lot = await client.lot.findFirstOrThrow({ where: { number: 31 } });
  const priceBefore = lot.minimumBid.toFixed(2);
  await assert.rejects(
    client.lot.update({ where: { id: lot.id }, data: { minimumBid: "-1.00" } }),
  );
  assert.equal(
    (
      await client.lot.findUniqueOrThrow({ where: { id: lot.id } })
    ).minimumBid.toFixed(2),
    priceBefore,
  );
  await assert.rejects(
    client.auction.update({
      where: { id: lot.auctionId },
      data: {
        proposalStartsAt: new Date("2026-12-02"),
        proposalEndsAt: new Date("2026-12-01"),
      },
    }),
  );

  const changed = structuredClone(source);
  changed.auctions[0].lots[0].minimumBid = "999.99";
  await importCuration(client, changed);
  assert.equal(
    (
      await client.lot.findUniqueOrThrow({ where: { id: lot.id } })
    ).minimumBid.toFixed(2),
    priceBefore,
  );

  await client.lot.update({
    where: { id: lot.id },
    data: { deletedAt: new Date() },
  });
  try {
    const rollbackSource = structuredClone(source);
    const rollbackLot = structuredClone(rollbackSource.auctions[0].lots[0]);
    rollbackLot.number = 2_147_483_646;
    rollbackLot.officialUrl = `${rollbackSource.auctions[0].officialUrl}/lote/${rollbackLot.number}`;
    rollbackSource.auctions[0].lots.unshift(rollbackLot);
    await assert.rejects(importCuration(client, rollbackSource));
    assert.equal(
      await client.lot.count({ where: { number: rollbackLot.number } }),
      0,
    );
  } finally {
    await client.lot.update({
      where: { id: lot.id },
      data: { deletedAt: lot.deletedAt },
    });
  }

  const password = randomBytes(24).toString("base64url");
  const seedEnvironment = {
    DATABASE_URL: databaseUrl,
    ADMIN_EMAIL: "integration-admin@example.test",
    ADMIN_PASSWORD: password,
    SEED_DEMO_DATA: "true",
  };
  const seedResult = await seedDatabase(client, seedEnvironment);
  const admin = await client.user.findUniqueOrThrow({
    where: { email: seedEnvironment.ADMIN_EMAIL },
  });
  assert.equal(admin.role, "ADMIN");
  assert.ok(admin.passwordHash.startsWith("$argon2id$"));
  if (seedResult.adminCreated)
    assert.equal(await verify(admin.passwordHash, password), true);
  await seedDatabase(client, {
    ...seedEnvironment,
    ADMIN_PASSWORD: randomBytes(24).toString("base64url"),
  });
  assert.equal(
    (await client.user.findUniqueOrThrow({ where: { id: admin.id } }))
      .passwordHash,
    admin.passwordHash,
  );
  assert.equal(
    await client.auction.count({
      where: { officialNumber: "DEMO/000001/2026" },
    }),
    1,
  );
  assert.equal(
    await client.lot.count({ where: { slug: "lote-demonstracao-1" } }),
    1,
  );

  const rateSecret = randomBytes(32).toString("base64url");
  const accountEmail = `rate-${randomBytes(8).toString("hex")}@example.test`;
  const accountAddress = "203.0.113.11";
  const clientAddress = "203.0.113.12";
  const keys = [
    loginRateLimitKey("account", accountEmail, rateSecret),
    loginRateLimitKey("client", accountAddress, rateSecret),
    loginRateLimitKey("client", clientAddress, rateSecret),
  ];
  const addresses = Array.from(
    { length: CLIENT_LOGIN_LIMIT + 2 },
    (_, index) =>
      `rate-${index}-${randomBytes(8).toString("hex")}@example.test`,
  );
  keys.push(
    ...addresses.map((email) =>
      loginRateLimitKey("account", email, rateSecret),
    ),
  );
  try {
    const attempts = await Promise.all(
      Array.from({ length: ACCOUNT_LOGIN_LIMIT + 4 }, () =>
        consumeLoginRateLimit(client, accountEmail, accountAddress, rateSecret),
      ),
    );
    assert.equal(attempts.filter(Boolean).length, ACCOUNT_LOGIN_LIMIT);
    await client.loginRateLimit.update({
      where: { key: keys[0] },
      data: { expiresAt: new Date(0) },
    });
    assert.equal(
      await consumeLoginRateLimit(
        client,
        accountEmail,
        accountAddress,
        rateSecret,
      ),
      true,
    );
    const clientAttempts = await Promise.all(
      addresses.map((email) =>
        consumeLoginRateLimit(client, email, clientAddress, rateSecret),
      ),
    );
    assert.equal(clientAttempts.filter(Boolean).length, CLIENT_LOGIN_LIMIT);
  } finally {
    await client.loginRateLimit.deleteMany({ where: { key: { in: keys } } });
  }

  assert.ok(await findActiveAdmin(client, admin.id, admin.updatedAt.getTime()));
  await client.user.update({
    where: { id: admin.id },
    data: { active: false },
  });
  try {
    assert.equal(
      await findActiveAdmin(client, admin.id, admin.updatedAt.getTime()),
      null,
    );
  } finally {
    await client.user.update({
      where: { id: admin.id },
      data: { active: admin.active },
    });
  }

  console.log(
    "Autenticação validada: limites atômicos de conta/cliente sob concorrência, expiração dos contadores e revogação de acesso.",
  );
  console.log(
    "Integração PostgreSQL validada: importação repetível, valores exatos, mercadorias preservadas, checks SQL, soft delete e seed Argon2id sem redefinir senhas.",
  );
} finally {
  await client.$disconnect();
}
