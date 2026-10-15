"use client";

import { useState } from "react";
import { ClipboardPaste, LoaderCircle, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "./form-fields";

export function ClipboardImport<T extends object>({
  onImport,
  parser,
  textLabel,
  disabled,
}: {
  onImport: (values: T) => void;
  parser: (text: string, html?: string) => T;
  textLabel: string;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function apply(value: string, richText = html) {
    setError(null);
    setSuccess(null);
    try {
      const parsed = parser(value, richText);
      onImport(parsed);
      setSuccess(
        `${Object.keys(parsed).length} campos preenchidos. Revise os dados antes de salvar.`,
      );
      setText(value);
      setHtml(richText);
      setShowPaste(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível interpretar o conteúdo copiado.",
      );
    }
  }

  async function readClipboard() {
    setBusy(true);
    setError(null);
    try {
      if (!navigator.clipboard?.read && !navigator.clipboard?.readText)
        throw new Error(
          "Seu navegador não permite ler a área de transferência.",
        );
      let value = "";
      let richText = "";
      if (navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes("text/plain"))
            value = await (await item.getType("text/plain")).text();
          if (item.types.includes("text/html"))
            richText = await (await item.getType("text/html")).text();
        }
        if (!value && richText) {
          value =
            new DOMParser()
              .parseFromString(richText, "text/html")
              .body.textContent?.trim() ?? "";
        }
      } else {
        value = await navigator.clipboard.readText();
      }
      if (!value.trim()) throw new Error("A área de transferência está vazia.");
      apply(value, richText);
    } catch (cause) {
      setShowPaste(true);
      setError(
        cause instanceof Error
          ? `${cause.message} Cole o conteúdo no campo abaixo.`
          : "Acesso ao clipboard indisponível. Cole o conteúdo no campo abaixo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="clipboard-import-title"
      className="mb-8 space-y-3 border-y py-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={disabled || busy}
          onClick={readClipboard}
        >
          {busy ? (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <ClipboardPaste aria-hidden="true" />
          )}
          Ler dados copiados
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11"
          disabled={disabled || busy}
          aria-expanded={showPaste}
          aria-controls="clipboard-import-text"
          onClick={() => setShowPaste((shown) => !shown)}
        >
          {showPaste ? "Ocultar campo de colagem" : "Colar texto manualmente"}
        </Button>
        <p
          id="clipboard-import-title"
          className="text-sm text-muted-foreground"
        >
          Preenche os dados encontrados; revise tudo antes de salvar.
        </p>
      </div>
      {showPaste && (
        <div className="max-w-4xl space-y-3">
          <label
            htmlFor="clipboard-import-text"
            className="text-sm font-medium"
          >
            {textLabel}
          </label>
          <textarea
            id="clipboard-import-text"
            value={text}
            maxLength={20_000}
            rows={6}
            className={`${inputClass} min-h-32 resize-y font-mono text-xs`}
            disabled={disabled || busy}
            onChange={(event) => {
              setText(event.target.value);
              setHtml("");
            }}
            onPaste={(event) => {
              const pastedHtml = event.clipboardData.getData("text/html");
              if (!pastedHtml) return;
              event.preventDefault();
              setText(event.clipboardData.getData("text/plain"));
              setHtml(pastedHtml);
            }}
          />
          <Button
            type="button"
            className="h-11"
            disabled={disabled || busy || !text.trim()}
            onClick={() => apply(text, html)}
          >
            <WandSparkles aria-hidden="true" />
            Preencher campos
          </Button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          aria-label="Erro ao ler conteúdo copiado"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-primary">
          {success}
        </p>
      )}
    </section>
  );
}
