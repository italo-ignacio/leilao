import Link from "next/link";
import { ArrowUpRight, Clock3, Gavel, PackageOpen } from "lucide-react";
import type { findPublicHomeHighlights } from "@/lib/catalog";
import { LotCard, type PublicLotCardData } from "./lot-card";

type HomeData = Awaited<ReturnType<typeof findPublicHomeHighlights>>;

function LotSection({ title, description, lots, empty }: { title: string; description: string; lots: PublicLotCardData[]; empty: string }) {
  return (
    <section className="border-t py-8" aria-label={title}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
        <Link href="/lotes" className="rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2">Todos os lotes</Link>
      </div>
      {lots.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{lots.map((lot) => <LotCard key={lot.id} lot={lot} />)}</div> : <p className="py-5 text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}

export function CatalogHome({ data }: { data: HomeData }) {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-8 grid gap-6 border-b pb-8 md:grid-cols-[1fr_auto] md:items-end">
        <div className="max-w-2xl"><p className="mb-3 text-sm font-semibold text-primary">Curadoria manual de leilões</p><h1 className="text-3xl leading-tight font-bold sm:text-4xl">Leilões RFB</h1><p className="mt-3 text-base leading-7 text-muted-foreground">Lotes selecionados para você comparar localização, descrição e lance mínimo antes de consultar o edital.</p></div>
        <Link href="/lotes" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2">Explorar lotes<ArrowUpRight aria-hidden="true" className="size-4" /></Link>
      </header>
      <section aria-label="Resumo dos leilões" className="grid gap-4 py-2 sm:grid-cols-3">
        <div className="flex items-center gap-3 border-l-2 border-primary px-4 py-2"><Gavel aria-hidden="true" className="size-5 text-primary" /><div><p className="text-xl font-bold tabular-nums">{data.openAuctionCount}</p><p className="text-sm text-muted-foreground">leilões com propostas abertas</p></div></div>
        <div className="flex items-center gap-3 border-l-2 border-amber-500 px-4 py-2"><Clock3 aria-hidden="true" className="size-5 text-amber-600" /><div><p className="text-xl font-bold tabular-nums">{data.closingSoonCount}</p><p className="text-sm text-muted-foreground">encerram nos próximos 7 dias</p></div></div>
        <div className="flex items-center gap-3 border-l-2 border-foreground/30 px-4 py-2"><PackageOpen aria-hidden="true" className="size-5" /><div><p className="text-xl font-bold tabular-nums">{data.publishedCount}</p><p className="text-sm text-muted-foreground">lotes publicados</p></div></div>
      </section>
      <LotSection title="Adicionados recentemente" description="Últimos lotes publicados na curadoria" lots={data.latest} empty="Nenhum lote publicado no momento. Consulte a fonte oficial para verificar novos editais." />
      <LotSection title="Encerrando em breve" description="Propostas com prazo próximo do encerramento" lots={data.closingSoon} empty="Nenhum lote publicado com encerramento nos próximos sete dias." />
      <LotSection title="Propostas abertas" description="Lotes dentro do período oficial de propostas" lots={data.open} empty="Nenhum lote publicado com propostas abertas no momento." />
    </div>
  );
}