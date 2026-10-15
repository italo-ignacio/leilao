import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex min-h-64 w-full max-w-6xl flex-1 items-center justify-center gap-3 px-5 py-10 sm:px-8"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-5 animate-spin text-primary motion-reduce:animate-none"
      />
      <p role="status" className="text-sm text-muted-foreground">
        Carregando catálogo...
      </p>
    </main>
  );
}
