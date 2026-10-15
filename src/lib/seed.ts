import { argon2id, hash } from "argon2";
import { z } from "zod";
import { Prisma, type PrismaClient } from "../generated/prisma/client";

export const seedEnvironmentSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    ADMIN_PASSWORD: z.string().min(12).max(128),
    ADMIN_NAME: z.string().trim().min(1).max(160).default("Administrador"),
    SEED_DEMO_DATA: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((environment, context) => {
    if (environment.SEED_DEMO_DATA !== "true") return;
    try {
      if (
        ["localhost", "127.0.0.1", "[::1]"].includes(
          new URL(environment.DATABASE_URL).hostname,
        )
      )
        return;
    } catch {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "URL de banco inválida.",
      });
      return;
    }
    context.addIssue({
      code: "custom",
      path: ["SEED_DEMO_DATA"],
      message: "Dados fictícios são permitidos somente em banco local.",
    });
  });

export async function seedDatabase(client: PrismaClient, input: unknown) {
  const environment = seedEnvironmentSchema.parse(input);

  return client.$transaction(
    async (transaction) => {
      let adminCreated = false;
      const existing = await transaction.user.findUnique({
        where: { email: environment.ADMIN_EMAIL },
      });
      if (existing) {
        if (
          existing.role !== "ADMIN" ||
          !existing.active ||
          existing.deletedAt
        ) {
          throw new Error(
            "Usuário existente não pode ser promovido ou reativado pelo seed.",
          );
        }
      } else {
        await transaction.user.create({
          data: {
            email: environment.ADMIN_EMAIL,
            name: environment.ADMIN_NAME,
            passwordHash: await hash(environment.ADMIN_PASSWORD, {
              type: argon2id,
              memoryCost: 65_536,
              timeCost: 3,
              parallelism: 1,
            }),
            role: "ADMIN",
          },
        });
        adminCreated = true;
      }

      if (environment.SEED_DEMO_DATA === "true") {
        const category = await transaction.category.upsert({
          where: { slug: "demonstracao" },
          update: {},
          create: { slug: "demonstracao", name: "DEMONSTRAÇÃO" },
        });
        const auction = await transaction.auction.upsert({
          where: { officialNumber: "DEMO/000001/2026" },
          update: {},
          create: {
            officialNumber: "DEMO/000001/2026",
            slug: "edital-demonstracao",
            title: "EXEMPLO - Edital demonstrativo",
            agency: "Demonstração",
            unit: "Unidade fictícia",
            officialUrl: "https://example.com/leiloes/demonstracao",
          },
        });
        await transaction.lot.upsert({
          where: { auctionId_number: { auctionId: auction.id, number: 1 } },
          update: {},
          create: {
            auctionId: auction.id,
            number: 1,
            slug: "lote-demonstracao-1",
            title: "EXEMPLO - Lote demonstrativo",
            description:
              "Registro fictício para desenvolvimento. Não corresponde a um leilão real.",
            categoryId: category.id,
            minimumBid: new Prisma.Decimal("100.00"),
            state: "SP",
            city: "São Paulo",
            storageFacility: "Depósito fictício",
            officialUrl: "https://example.com/leiloes/demonstracao/lote/1",
            items: {
              create: {
                position: 0,
                quantity: new Prisma.Decimal("1"),
                unit: "un",
                description: "Mercadoria fictícia",
              },
            },
          },
        });
      }

      return {
        adminCreated,
        demoDataRequested: environment.SEED_DEMO_DATA === "true",
      };
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
}
