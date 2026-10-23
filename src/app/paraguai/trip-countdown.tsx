"use client";

import { useEffect, useState } from "react";

const departure = Date.parse("2026-12-13T00:00:00-03:00");

export function getTripRemaining(now: number) {
  const seconds = Math.max(0, Math.ceil((departure - now) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    arrived: seconds === 0,
  };
}

export function TripCountdown() {
  const [remaining, setRemaining] = useState<ReturnType<
    typeof getTripRemaining
  > | null>(null);
  useEffect(() => {
    const update = () => setRemaining(getTripRemaining(Date.now()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="countdown">
      <p className="countdownTitle" role="status">
        {remaining?.arrived
          ? "Chegou o dia. Boa viagem!"
          : "Falta pouco para partir"}
      </p>
      <div
        className="timer"
        role="timer"
        aria-label="Tempo restante para a viagem"
        aria-live="off"
      >
        {(
          [
            ["days", "Dias"],
            ["hours", "Horas"],
            ["minutes", "Minutos"],
            ["seconds", "Segundos"],
          ] as const
        ).map(([field, label]) => (
          <div className="unit" key={field}>
            <span className="value">
              {remaining ? String(remaining[field]).padStart(2, "0") : "--"}
            </span>
            <span className="label">{label}</span>
          </div>
        ))}
      </div>
      <p className="note">
        {remaining?.arrived
          ? "A espera acabou. Que venham as histórias."
          : "Até lá, a gente conta os segundos."}
      </p>
    </div>
  );
}
