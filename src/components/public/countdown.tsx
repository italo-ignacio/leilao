"use client";

import { useEffect, useState } from "react";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function getRemaining(target: number): Remaining {
  const total = Math.max(0, target - Date.now());
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total / 3_600_000) % 24),
    minutes: Math.floor((total / 60_000) % 60),
    seconds: Math.floor((total / 1_000) % 60),
  };
}

export function Countdown({ endsAt }: { endsAt: string | null }) {
  const target = endsAt ? Date.parse(endsAt) : Number.NaN;
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const update = () => setRemaining(getRemaining(target));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (!Number.isFinite(target)) return <p className="text-sm text-muted-foreground">Data de encerramento não informada</p>;
  if (!remaining) return <p className="text-sm text-muted-foreground">Calculando prazo...</p>;
  if (remaining.days + remaining.hours + remaining.minutes + remaining.seconds === 0) return <p className="text-sm font-semibold">Período de propostas encerrado</p>;
  return (
    <p aria-live="off" className="text-sm tabular-nums">
      {remaining.days > 0 && `${remaining.days}d `}{String(remaining.hours).padStart(2, "0")}:{String(remaining.minutes).padStart(2, "0")}:{String(remaining.seconds).padStart(2, "0")} restantes
    </p>
  );
}