import type { Metadata } from "next";
import Link from "next/link";
import { Gavel } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
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
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-sm text-lg font-bold focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <Gavel aria-hidden="true" className="size-6 text-primary" />
            Leilões RFB
          </Link>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
