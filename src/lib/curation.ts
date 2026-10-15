import { z } from "zod";

const text = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),
    "Texto contém caracteres de controle.",
  );

export const moneySchema = z
  .string()
  .regex(
    /^(?:0|[1-9]\d{0,15})\.\d{2}$/,
    "Informe um valor monetário decimal em string, com duas casas.",
  );

const officialUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    url.hostname === "www25.receita.fazenda.gov.br" &&
    !url.username &&
    !url.password &&
    !url.port &&
    !url.hash &&
    !url.search
  );
}, "Use uma URL HTTPS do portal oficial da Receita Federal.");

export const states = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const itemSchema = z.strictObject({
  quantity: z.number().int().positive().max(2_147_483_647),
  unit: text.max(20),
  description: text.max(10_000),
});

const lotSchema = z.strictObject({
  number: z.number().int().positive().max(2_147_483_647),
  title: text.max(240),
  category: text.max(100),
  sourceStatus: text.max(100),
  minimumBid: moneySchema,
  appraisalValue: moneySchema.nullable(),
  currency: z.literal("BRL"),
  officialUrl: officialUrlSchema,
  sourceParticipationIconUrl: officialUrlSchema
    .refine(
      (value) =>
        /^\/sle-sociedade\/assets\/icone-edital-(pj|misto)\.png$/.test(
          new URL(value).pathname,
        ),
      "Ícone de participação inválido.",
    )
    .optional(),
  state: z.enum(states),
  city: text.max(160),
  storageFacility: text.max(240),
  pickupAddress: text.max(2_000).nullable(),
  images: z.array(z.never()).length(0),
  items: z.array(itemSchema).min(1).max(10_000),
});

const auctionSchema = z.strictObject({
  officialNumber: z.string().regex(/^\d{7}\/\d{6}\/\d{4}$/),
  agency: text.max(160),
  unit: text.max(300),
  officialUrl: officialUrlSchema,
  sourceStatus: text.max(100),
  noticeDocumentUrl: officialUrlSchema.nullable(),
  lots: z.array(lotSchema).min(1).max(10_000),
});

export const curationSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    source: z.literal("MANUAL_USER_COPY"),
    persistenceStatus: z.enum(["PENDING_DATABASE_IMPORT", "IMPORTED"]),
    auctions: z.array(auctionSchema).min(1).max(1_000),
  })
  .superRefine((data, context) => {
    const auctionNumbers = new Set<string>();
    for (const [auctionIndex, auction] of data.auctions.entries()) {
      const path = ["auctions", auctionIndex];
      if (auctionNumbers.has(auction.officialNumber)) {
        context.addIssue({
          code: "custom",
          path,
          message: "Edital duplicado.",
        });
      }
      auctionNumbers.add(auction.officialNumber);
      const [unit, number, year] = auction.officialNumber.split("/");
      const expectedUrl = `https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/${Number(unit)}/${Number(number)}/${year}`;
      if (auction.officialUrl !== expectedUrl) {
        context.addIssue({
          code: "custom",
          path: [...path, "officialUrl"],
          message: "URL não corresponde ao número do edital.",
        });
      }
      const lotNumbers = new Set<number>();
      for (const [lotIndex, lot] of auction.lots.entries()) {
        if (lotNumbers.has(lot.number)) {
          context.addIssue({
            code: "custom",
            path: [...path, "lots", lotIndex],
            message: "Lote duplicado neste edital.",
          });
        }
        lotNumbers.add(lot.number);
        if (lot.officialUrl !== `${expectedUrl}/lote/${lot.number}`) {
          context.addIssue({
            code: "custom",
            path: [...path, "lots", lotIndex, "officialUrl"],
            message: "URL não corresponde ao edital/lote.",
          });
        }
      }
    }
  });

export type CuratedData = z.infer<typeof curationSchema>;

export function toSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
