import { LoaderCircle } from "lucide-react";

export default function AdminLoading() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex w-full max-w-6xl flex-1 items-center gap-3 px-5 py-12 sm:px-8"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-5 animate-spin text-primary motion-reduce:animate-none"
      />
      <p role="status" className="text-sm text-muted-foreground">
        Carregando administração...
      </p>
    </main>
  );
}
