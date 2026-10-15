import { z } from "zod";

export const BRAZILIAN_STATES = [
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

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  });

const decimalFilter = z
  .string()
  .regex(/^\d{1,16}(?:[.,]\d{1,2})?$/)
  .transform((value) => {
    const [integer, fraction = ""] = value.replace(",", ".").split(".");
    return `${integer}.${fraction.padEnd(2, "0")}`;
  });

function toCents(value: string): bigint {
  const [integer, fraction = "00"] = value.split(".");
  return BigInt(integer) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

export const publicCatalogFiltersSchema = z
  .object({
    q: z.string().trim().max(120).catch(""),
    categoria: z
      .string()
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .catch(""),
    uf: z.enum(BRAZILIAN_STATES).or(z.literal("")).catch(""),
    cidade: z.string().trim().max(100).catch(""),
    valorMin: decimalFilter.catch(""),
    valorMax: decimalFilter.catch(""),
    status: z
      .enum([
        "",
        "UNSCHEDULED",
        "SCHEDULED",
        "OPEN",
        "CLOSED",
        "SUSPENDED",
        "CANCELLED",
      ])
      .catch(""),
    modalidade: z.enum(["", "UNKNOWN", "ELECTRONIC", "LIVE"]).catch(""),
    dataDe: dateSchema.catch(""),
    dataAte: dateSchema.catch(""),
    ordenar: z
      .enum(["recentes", "preco-menor", "preco-maior", "encerrando"])
      .catch("recentes"),
    page: z.coerce.number().int().min(1).max(10_000).catch(1),
  })
  .superRefine((filters, context) => {
    if (
      filters.valorMin &&
      filters.valorMax &&
      toCents(filters.valorMin) > toCents(filters.valorMax)
    ) {
      context.addIssue({
        code: "custom",
        path: ["valorMin"],
        message: "O valor mínimo não pode exceder o máximo.",
      });
    }
    if (filters.dataDe && filters.dataAte && filters.dataDe > filters.dataAte) {
      context.addIssue({
        code: "custom",
        path: ["dataDe"],
        message: "A data inicial deve anteceder a final.",
      });
    }
  });

export type PublicCatalogSearchParams = Record<
  string,
  string | string[] | undefined
>;
export type PublicCatalogFilters = z.infer<typeof publicCatalogFiltersSchema>;

export function clampCatalogPage(page: number, total: number, pageSize = 12) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return { page: Math.min(page, pages), pages };
}

export function parsePublicCatalogFilters(params: PublicCatalogSearchParams) {
  const scalar = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  const parsed = publicCatalogFiltersSchema.safeParse(scalar);
  return parsed.success ? parsed.data : publicCatalogFiltersSchema.parse({});
}

export function dateRangeBounds(
  filters: Pick<PublicCatalogFilters, "dataDe" | "dataAte">,
) {
  const endExclusive = filters.dataAte
    ? new Date(`${filters.dataAte}T00:00:00.000Z`)
    : undefined;
  endExclusive?.setUTCDate(endExclusive.getUTCDate() + 1);
  return {
    gte: filters.dataDe
      ? new Date(`${filters.dataDe}T00:00:00.000Z`)
      : undefined,
    lt: endExclusive,
  };
}
