import { describe, expect, it } from "vitest";
import { getAuctionStatus } from "./auction-status";

const schedule = {
  proposalStartsAt: new Date("2026-11-04T11:00:00Z"),
  proposalEndsAt: new Date("2026-11-11T00:00:00Z"),
};

describe("getAuctionStatus", () => {
  it.each([
    ["2026-11-04T10:59:59Z", "SCHEDULED"],
    ["2026-11-04T11:00:00Z", "OPEN"],
    ["2026-11-10T23:59:59Z", "OPEN"],
    ["2026-11-11T00:00:00Z", "CLOSED"],
    ["2026-12-01T00:00:00Z", "CLOSED"],
  ])("resolves the proposal window at %s", (instant, expected) => {
    expect(getAuctionStatus(schedule, new Date(instant))).toBe(expected);
  });

  it.each([
    { proposalStartsAt: null, proposalEndsAt: null },
    { proposalStartsAt: schedule.proposalStartsAt, proposalEndsAt: null },
    { proposalStartsAt: null, proposalEndsAt: schedule.proposalEndsAt },
  ])("does not invent missing dates", (incomplete) => {
    expect(getAuctionStatus(incomplete)).toBe("UNSCHEDULED");
  });

  it.each(["SUSPENDED", "CANCELLED"] as const)(
    "preserves an exceptional status: %s",
    (statusOverride) => {
      expect(
        getAuctionStatus(
          { ...schedule, statusOverride },
          new Date("2027-01-01"),
        ),
      ).toBe(statusOverride);
      expect(
        getAuctionStatus({
          proposalStartsAt: null,
          proposalEndsAt: null,
          statusOverride,
        }),
      ).toBe(statusOverride);
    },
  );

  it("rejects reversed and invalid dates", () => {
    expect(() =>
      getAuctionStatus({
        proposalStartsAt: schedule.proposalEndsAt,
        proposalEndsAt: schedule.proposalStartsAt,
      }),
    ).toThrow(RangeError);
    expect(() =>
      getAuctionStatus({ ...schedule, proposalEndsAt: new Date("invalid") }),
    ).toThrow(RangeError);
    expect(() => getAuctionStatus(schedule, new Date("invalid"))).toThrow(
      RangeError,
    );
  });
});
