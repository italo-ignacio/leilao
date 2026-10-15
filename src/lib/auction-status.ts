export type AuctionStatus =
  "UNSCHEDULED" | "SCHEDULED" | "OPEN" | "CLOSED" | "SUSPENDED" | "CANCELLED";

export type StatusOverride = "SUSPENDED" | "CANCELLED";

export type AuctionSchedule = {
  proposalStartsAt: Date | null;
  proposalEndsAt: Date | null;
  statusOverride?: StatusOverride | null;
};

export function getAuctionStatus(
  schedule: AuctionSchedule,
  now = new Date(),
): AuctionStatus {
  const { proposalStartsAt, proposalEndsAt, statusOverride } = schedule;

  if (statusOverride) return statusOverride;
  if (!proposalStartsAt || !proposalEndsAt) return "UNSCHEDULED";

  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isFinite(proposalStartsAt.getTime()) ||
    !Number.isFinite(proposalEndsAt.getTime()) ||
    proposalEndsAt <= proposalStartsAt
  ) {
    throw new RangeError("Período de propostas inválido.");
  }

  if (now < proposalStartsAt) return "SCHEDULED";
  if (now >= proposalEndsAt) return "CLOSED";
  return "OPEN";
}
