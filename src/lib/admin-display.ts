import type { AuctionStatus } from "./auction-status";

export const statusLabels: Record<AuctionStatus, string> = {
  UNSCHEDULED: "Sem datas",
  SCHEDULED: "Agendado",
  OPEN: "Aberto",
  CLOSED: "Encerrado",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(value: string): string {
  const [integer, fraction = "00"] = value.split(".");
  return moneyFormatter
    .formatToParts(BigInt(integer))
    .map((part) =>
      part.type === "fraction" ? fraction.padEnd(2, "0") : part.value,
    )
    .join("");
}
