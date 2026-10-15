import { z } from "zod";
import { states, toSlug } from "./curation";

export const recordIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = z
  .string()
  .trim()
  .refine(
    (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),
    "Texto contém caracteres inválidos.",
  );
const requiredText = (max: number) =>
  text
    .min(1, "Campo obrigatório.")
    .max(max, `Use no máximo ${max} caracteres.`);
const url = z.url("Informe uma URL válida.").refine((value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}, "Use uma URL HTTPS sem credenciais.");
const optionalUrl = z.union([z.literal(""), url]);
const version = z.union([z.literal(""), z.iso.datetime()]);
const localDate = z.union([
  z.literal(""),
  z.iso.datetime({ local: true, precision: -1 }),
]);

export function normalizeDecimalInput(
  value: string,
  scale = 2,
  integerDigits = 16,
): string {
  const trimmed = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(trimmed))
    throw new Error("Informe um valor válido, usando vírgula para decimais.");
  const [whole, fraction = ""] = trimmed.replaceAll(".", "").split(",");
  const integer = whole.replace(/^0+(?=\d)/, "");
  if (integer.length > integerDigits || fraction.length > scale)
    throw new Error("Valor fora do limite permitido.");
  return `${integer}.${fraction.padEnd(scale, "0")}`;
}

function isValidDecimal(
  value: string,
  scale: number,
  digits: number,
  positive = false,
): boolean {
  try {
    const normalized = normalizeDecimalInput(value, scale, digits);
    return !positive || /[1-9]/.test(normalized);
  } catch {
    return false;
  }
}

const money = text.refine(
  (value) => isValidDecimal(value, 2, 16),
  "Informe um valor em reais, por exemplo 2.069,00.",
);
const quantity = text.refine(
  (value) => isValidDecimal(value, 3, 11, true),
  "Informe uma quantidade positiva, com até 3 casas decimais.",
);

export function parseAdminDate(value: string): Date | null {
  return value ? new Date(`${value}:00-03:00`) : null;
}

export function toAdminDate(value: Date | null): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export const auctionFormSchema = z
  .strictObject({
    version,
    officialNumber: z
      .string()
      .trim()
      .regex(/^\d{7}\/\d{6}\/\d{4}$/, "Use o formato 0800100/000014/2026."),
    title: requiredText(240),
    agency: requiredText(160),
    unit: requiredText(300),
    mode: z.enum(["UNKNOWN", "ELECTRONIC", "LIVE"]),
    officialUrl: url,
    noticeDocumentUrl: optionalUrl,
    publicationStatus: z.enum(["DRAFT", "PUBLISHED"]),
    statusOverride: z.enum(["", "SUSPENDED", "CANCELLED"]),
    sourceStatus: text.max(100),
    proposalStartsAt: localDate,
    proposalEndsAt: localDate,
    classificationAt: localDate,
    biddingStartsAt: localDate,
    biddingEndsAt: localDate,
  })
  .superRefine((data, context) => {
    for (const [start, end] of [
      ["proposalStartsAt", "proposalEndsAt"],
      ["biddingStartsAt", "biddingEndsAt"],
    ] as const) {
      if (data[start] && data[end] && data[end] <= data[start])
        context.addIssue({
          code: "custom",
          path: [end],
          message: "O fim deve ser posterior ao início.",
        });
    }
  });

export const lotFormSchema = z.strictObject({
  version,
  auctionId: recordIdSchema,
  number: z
    .string()
    .trim()
    .regex(/^[1-9]\d{0,8}$/, "Informe um número de lote positivo."),
  title: requiredText(240),
  description: requiredText(60_000),
  categoryId: recordIdSchema,
  minimumBid: money,
  appraisalValue: z.union([z.literal(""), money]),
  state: z.enum(states),
  city: requiredText(160),
  storageFacility: requiredText(240),
  pickupAddress: text.max(2_000),
  officialUrl: url,
  sourceStatus: text.max(100),
  participationType: z.enum([
    "UNKNOWN",
    "LEGAL_ENTITY",
    "INDIVIDUAL_AND_LEGAL_ENTITY",
  ]),
  publicationStatus: z.enum(["DRAFT", "PUBLISHED"]),
  statusOverride: z.enum(["", "SUSPENDED", "CANCELLED"]),
  personalNotes: text.max(20_000),
  items: z
    .array(
      z.strictObject({
        quantity,
        unit: requiredText(20),
        description: requiredText(2_000),
      }),
    )
    .min(1, "Adicione ao menos uma mercadoria.")
    .max(300),
});

export const categoryFormSchema = z.strictObject({
  version,
  name: requiredText(100).refine(
    (value) => toSlug(value).length > 0,
    "Informe um nome com letras ou números.",
  ),
  active: z.boolean(),
});

export type AuctionFormValues = z.infer<typeof auctionFormSchema>;
export type LotFormValues = z.infer<typeof lotFormSchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export const recordMutationSchema = z.strictObject({
  id: recordIdSchema,
  version: z.iso.datetime(),
  operation: z.enum(["archive", "restore", "delete"]),
});

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fields?: Record<string, string> };
