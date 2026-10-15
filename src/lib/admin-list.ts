import { z } from "zod";

export const ADMIN_PAGE_SIZE = 20;
export type AdminSearchParams = Record<string, string | string[] | undefined>;

export function parseAdminFilters(params: AdminSearchParams) {
  return z
    .object({
      q: z.string().trim().max(160).catch(""),
      page: z.coerce.number().int().min(1).max(100_000).catch(1),
      estado: z.enum(["ativos", "arquivados", "todos"]).catch("ativos"),
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
    })
    .parse(params);
}

export type AdminFilters = ReturnType<typeof parseAdminFilters>;
