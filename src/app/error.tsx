"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnofficialNotice } from "@/components/unofficial-notice";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <UnofficialNotice />
      <main className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-start justify-center gap-4 px-5 sm:px-8">
        <h1 className="text-3xl font-bold">
          Não foi possível carregar a página
        </h1>
        <p className="text-muted-foreground">Tente novamente em instantes.</p>
        <Button onClick={reset} className="min-h-11">
          <RefreshCw aria-hidden="true" />
          Tentar novamente
        </Button>
      </main>
    </>
  );
}
