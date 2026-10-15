import "dotenv/config";
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { createDatabaseClient } from "../../src/lib/database";
import {
  saveAuction,
  saveCategory,
  saveLot,
  mutateAdminRecord,
  getAdminDashboard,
  lotStatusWhere,
} from "../../src/lib/admin-records";
import { validateTestDatabaseUrl } from "../../src/lib/test-database-target";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("Configure TEST_DATABASE_URL.");
validateTestDatabaseUrl(databaseUrl, process.env.E2E_ALLOW_REMOTE_DATABASE);
const client = createDatabaseClient(databaseUrl);
const suffix = String(randomInt(100_000, 999_999));
let auctionId: string | undefined;
let categoryId: string | undefined;
let lotId: string | undefined;
try {
  const auctionValues = {
    version: "",
    officialNumber: `9999999/${suffix}/2099`,
    title: "TESTE - Edital",
    agency: "RFB",
    unit: "Unidade de teste",
    mode: "ELECTRONIC",
    officialUrl: `https://www.gov.br/teste/${suffix}`,
    noticeDocumentUrl: "",
    publicationStatus: "DRAFT",
    statusOverride: "",
    sourceStatus: "Teste",
    proposalStartsAt: "",
    proposalEndsAt: "",
    classificationAt: "",
    biddingStartsAt: "",
    biddingEndsAt: "",
  };
  auctionId = (await saveAuction(client, null, auctionValues)).id;
  categoryId = (
    await saveCategory(client, null, {
      version: "",
      name: `Teste ${suffix}`,
      active: true,
    })
  ).id;
  const lotValues = {
    version: "",
    auctionId,
    number: "1",
    title: "TESTE - Lote",
    description: "Descrição de teste",
    categoryId,
    minimumBid: "2.069,00",
    appraisalValue: "3.000,01",
    state: "SP",
    city: "Bauru",
    storageFacility: "Depósito teste",
    pickupAddress: "",
    officialUrl: `https://www.gov.br/teste/${suffix}/lote/1`,
    sourceStatus: "Teste",
    participationType: "UNKNOWN",
    publicationStatus: "DRAFT",
    statusOverride: "",
    personalNotes: "Nota privada",
    items: [
      { quantity: "0,125", unit: "kg", description: "Mercadoria de teste" },
    ],
  };
  lotId = (await saveLot(client, null, lotValues)).id;
  let lot = await client.lot.findUniqueOrThrow({
    where: { id: lotId },
    include: { items: true },
  });
  assert.equal(lot.minimumBid.toFixed(2), "2069.00");
  assert.equal(lot.appraisalValue?.toFixed(2), "3000.01");
  assert.equal(lot.items[0].quantity.toString(), "0.125");
  const oldVersion = lot.updatedAt.toISOString();
  await saveLot(client, lotId, {
    ...lotValues,
    version: oldVersion,
    title: "TESTE - Lote atualizado",
  });
  await assert.rejects(
    saveLot(client, lotId, {
      ...lotValues,
      version: oldVersion,
      title: "Não deve sobrescrever",
    }),
  );
  lot = await client.lot.findUniqueOrThrow({
    where: { id: lotId },
    include: { items: true },
  });
  assert.equal(lot.title, "TESTE - Lote atualizado");
  await mutateAdminRecord(client, "lot", {
    id: lotId,
    version: lot.updatedAt.toISOString(),
    operation: "archive",
  });
  lot = await client.lot.findUniqueOrThrow({
    where: { id: lotId },
    include: { items: true },
  });
  assert.ok(lot.deletedAt);
  await mutateAdminRecord(client, "lot", {
    id: lotId,
    version: lot.updatedAt.toISOString(),
    operation: "restore",
  });
  assert.equal(
    (await client.lot.findUniqueOrThrow({ where: { id: lotId } })).deletedAt,
    null,
  );
  const category = await client.category.findUniqueOrThrow({
    where: { id: categoryId },
  });
  await assert.rejects(
    mutateAdminRecord(client, "category", {
      id: categoryId,
      version: category.updatedAt.toISOString(),
      operation: "delete",
    }),
  );
  assert.ok(await client.category.findUnique({ where: { id: categoryId } }));
  assert.ok(
    await client.lot.count({
      where: { AND: [{ id: lotId }, lotStatusWhere("UNSCHEDULED")] },
    }),
  );
  const summary = await getAdminDashboard(client);
  assert.equal(
    summary.statuses.reduce((total, status) => total + status.count, 0),
    summary.lots,
  );
  console.log(
    "CRUD validado: criação/edição, Decimal exato, controle de versão, arquivamento/restauração, vínculos e dashboard.",
  );
} finally {
  if (lotId) {
    await client.lotItem.deleteMany({ where: { lotId } });
    await client.lot.delete({ where: { id: lotId } });
  }
  if (auctionId) await client.auction.delete({ where: { id: auctionId } });
  if (categoryId) await client.category.delete({ where: { id: categoryId } });
  await client.$disconnect();
}
