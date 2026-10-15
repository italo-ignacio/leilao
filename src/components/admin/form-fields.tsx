import { cloneElement, type ReactElement, type ReactNode } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export const inputClass =
  "min-h-11 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export function FormField({
  id,
  label,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactElement;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {cloneElement(
        children as ReactElement<{
          id: string;
          "aria-invalid": boolean;
          "aria-describedby"?: string;
        }>,
        {
          id,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? `${id}-error` : undefined,
        },
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid min-w-0 gap-5 border-b pb-8 sm:grid-cols-2">
      <legend className="mb-5 text-base font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function SaveButton({ busy }: { busy: boolean }) {
  return (
    <Button type="submit" disabled={busy} className="h-11 gap-2 px-4">
      {busy ? (
        <LoaderCircle
          aria-hidden="true"
          className="animate-spin motion-reduce:animate-none"
        />
      ) : (
        <Save aria-hidden="true" />
      )}
      {busy ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function FormError({ error }: { error: string | null }) {
  return error ? (
    <p
      role="alert"
      aria-label="Falha ao salvar"
      className="rounded-md border border-destructive/30 p-3 text-sm text-destructive"
    >
      {error}
    </p>
  ) : null;
}
