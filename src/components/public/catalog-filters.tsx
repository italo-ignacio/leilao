import { Search } from "lucide-react";
import type { PublicCatalogFilters } from "@/lib/public-catalog-filters";
import { Button } from "@/components/ui/button";

export function CatalogFilters({
  filters,
  categories,
  states,
}: {
  filters: PublicCatalogFilters;
  categories: { name: string; slug: string }[];
  states: readonly string[];
}) {
  return (
    <form action="/lotes" method="get" className="grid gap-4 border-y py-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2 sm:col-span-2">
        <label htmlFor="q" className="text-sm font-medium">Buscar lotes</label>
        <input id="q" name="q" type="search" maxLength={120} defaultValue={filters.q} placeholder="Produto, edital ou cidade" className="h-11 w-full rounded-md border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <div className="space-y-2">
        <label htmlFor="categoria" className="text-sm font-medium">Categoria</label>
        <select id="categoria" name="categoria" defaultValue={filters.categoria} className="h-11 w-full rounded-md border bg-background px-3 text-base">
          <option value="">Todas</option>
          {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="uf" className="text-sm font-medium">UF</label>
        <select id="uf" name="uf" defaultValue={filters.uf} className="h-11 w-full rounded-md border bg-background px-3 text-base">
          <option value="">Todas</option>
          {states.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="cidade" className="text-sm font-medium">Cidade</label>
        <input id="cidade" name="cidade" maxLength={100} defaultValue={filters.cidade} className="h-11 w-full rounded-md border bg-background px-3 text-base" />
      </div>
      <div className="space-y-2">
        <label htmlFor="modalidade" className="text-sm font-medium">Modalidade</label>
        <select id="modalidade" name="modalidade" defaultValue={filters.modalidade} className="h-11 w-full rounded-md border bg-background px-3 text-base">
          <option value="">Todas</option><option value="ELECTRONIC">Eletrônica</option><option value="LIVE">Presencial</option><option value="UNKNOWN">Não informada</option>
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="status" className="text-sm font-medium">Situação das propostas</label>
        <select id="status" name="status" defaultValue={filters.status} className="h-11 w-full rounded-md border bg-background px-3 text-base">
          <option value="">Todas</option><option value="OPEN">Aberto</option><option value="SCHEDULED">Agendado</option><option value="CLOSED">Encerrado</option><option value="SUSPENDED">Suspenso</option><option value="CANCELLED">Cancelado</option><option value="UNSCHEDULED">Sem datas</option>
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="valorMin" className="text-sm font-medium">Lance mínimo a partir de</label>
        <input id="valorMin" name="valorMin" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" defaultValue={filters.valorMin.replace(".", ",")} placeholder="0,00" className="h-11 w-full rounded-md border bg-background px-3 text-base" />
      </div>
      <div className="space-y-2">
        <label htmlFor="valorMax" className="text-sm font-medium">Lance mínimo até</label>
        <input id="valorMax" name="valorMax" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" defaultValue={filters.valorMax.replace(".", ",")} placeholder="0,00" className="h-11 w-full rounded-md border bg-background px-3 text-base" />
      </div>
      <div className="space-y-2">
        <label htmlFor="dataDe" className="text-sm font-medium">Fim das propostas · de</label>
        <input id="dataDe" name="dataDe" type="date" defaultValue={filters.dataDe} className="h-11 w-full rounded-md border bg-background px-3 text-base" />
      </div>
      <div className="space-y-2">
        <label htmlFor="dataAte" className="text-sm font-medium">Fim das propostas · até</label>
        <input id="dataAte" name="dataAte" type="date" defaultValue={filters.dataAte} className="h-11 w-full rounded-md border bg-background px-3 text-base" />
      </div>
      <div className="space-y-2">
        <label htmlFor="ordenar" className="text-sm font-medium">Ordenar por</label>
        <select id="ordenar" name="ordenar" defaultValue={filters.ordenar} className="h-11 w-full rounded-md border bg-background px-3 text-base">
          <option value="recentes">Mais recentes</option><option value="encerrando">Encerrando primeiro</option><option value="preco-menor">Menor lance</option><option value="preco-maior">Maior lance</option>
        </select>
      </div>
      <div className="flex items-end">
        <Button type="submit" variant="outline" className="h-11 w-full sm:w-auto"><Search aria-hidden="true" />Filtrar lotes</Button>
      </div>
    </form>
  );
}