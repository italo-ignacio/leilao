import Link from "next/link";
import { ArrowUpRight, Gavel } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { FavoriteLink } from "@/components/public/favorite-link";
import { UnofficialNotice } from "@/components/unofficial-notice";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/"
            aria-label="Leilões RFB, início"
            className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <Gavel
              aria-hidden="true"
              className="size-6 shrink-0 text-primary"
            />
            <span className="text-lg font-bold">Leilões RFB</span>
          </Link>
          <div className="flex items-center gap-2">
            <FavoriteLink />
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-auto border-t bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-muted-foreground">
            Leilões RFB · Curadoria independente
          </p>
          <a
            href="https://www25.receita.fazenda.gov.br/sle-sociedade/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Receita Federal{" "}
            <ArrowUpRight aria-hidden="true" className="size-4" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </div>
        <UnofficialNotice />
      </footer>
    </div>
  );
}
