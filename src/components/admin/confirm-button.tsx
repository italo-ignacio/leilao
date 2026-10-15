"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmButton({
  label,
  title,
  children,
  disabled = false,
  onConfirm,
}: {
  label: string;
  title: string;
  children: ReactNode;
  disabled?: boolean;
  onConfirm: () => Promise<string | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10"
        title={label}
        aria-label={label}
        disabled={disabled || busy}
        onClick={() => {
          setError(null);
          dialog.current?.showModal();
        }}
      >
        {children}
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border bg-background p-6 text-foreground shadow-lg backdrop:bg-black/40"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-10"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const message = await onConfirm();
                if (message) setError(message);
                else dialog.current?.close();
              } catch {
                setError("Não foi possível concluir a operação.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Aguarde..." : "Confirmar"}
          </Button>
        </div>
      </dialog>
    </>
  );
}
