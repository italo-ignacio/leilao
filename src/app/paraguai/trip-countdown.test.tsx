import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getTripRemaining, TripCountdown } from "./trip-countdown";

afterEach(() => vi.useRealTimers());

describe("Paraguay trip countdown", () => {
  it("counts down to midnight on December 13 in Brasilia time", () => {
    expect(getTripRemaining(Date.parse("2026-12-11T21:57:56-03:00"))).toEqual({
      days: 1,
      hours: 2,
      minutes: 2,
      seconds: 4,
      arrived: false,
    });
  });

  it("never returns negative values after departure", () => {
    expect(getTripRemaining(Date.parse("2027-01-01T00:00:00Z"))).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      arrived: true,
    });
  });

  it("updates every second and displays the departure message", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-13T02:59:59Z"));
    const { unmount } = render(<TripCountdown />);
    expect(screen.getByRole("timer")).toHaveTextContent("01Segundos");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Chegou o dia. Boa viagem!",
    );
    expect(screen.getByRole("timer")).toHaveTextContent("00Segundos");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
