import Link from "next/link";
import { UnofficialNotice } from "@/components/unofficial-notice";

export default function NotFound() {
  return (
    <>
      <UnofficialNotice />
      <main className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-start justify-center gap-4 px-5 sm:px-8">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="text-3xl font-bold">Página não encontrada</h1>
        <p className="text-muted-foreground">
          Este endereço não existe ou não está mais disponível.
        </p>
        <Link
          href="/"
          className="rounded-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Voltar ao catálogo
        </Link>
      </main>
    </>
  );
}
