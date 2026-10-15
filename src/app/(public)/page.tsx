import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { connection } from "next/server";
import { CatalogHome } from "@/components/public/catalog-home";
import { findPublicHomeHighlights } from "@/lib/catalog";

export const instant = false;

async function HomeContent() {
  await connection();
  return <CatalogHome data={await findPublicHomeHighlights(new Date())} />;
}

export default function HomePage() {
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 outline-none"
    >
      <Suspense
        fallback={
          <div className="flex min-h-96 items-center gap-3 px-5 sm:px-8">
            <LoaderCircle
              aria-hidden="true"
              className="size-5 animate-spin motion-reduce:animate-none"
            />
            <p role="status">Carregando lotes publicados...</p>
          </div>
        }
      >
        <HomeContent />
      </Suspense>
    </main>
  );
}
