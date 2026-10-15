import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { statusLabels } from "@/lib/admin-display";
import type { AdminFilters } from "@/lib/admin-list";
import type { ReactNode } from "react";
import { inputClass } from "./form-fields";

export const tableClass =
  "w-full min-w-[48rem] text-left text-sm [&_th]:border-b [&_th]:px-3 [&_th]:py-3 [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:border-b [&_td]:px-3 [&_td]:py-3";

export function PageHeader({
  title,
  createHref,
  createLabel,
  backHref,
}: {
  title: string;
  createHref?: string;
  createLabel?: string;
  backHref?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-6">
      <div className="space-y-3">
        {backHref && (
          <a
            href={backHref}
            className="inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar
          </a>
        )}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      {createHref && (
        <a
          href={createHref}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <Plus aria-hidden="true" className="size-4" />
          {createLabel}
        </a>
      )}
    </div>
  );
}

export function AdminMain({ children }: { children: ReactNode }) {
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-5 py-8 outline-none sm:px-8 sm:py-10"
    >
      {children}
    </main>
  );
}

export function ListFilters({
  path,
  filters,
  showStatus = false,
  categories = false,
}: {
  path: string;
  filters: AdminFilters;
  showStatus?: boolean;
  categories?: boolean;
}) {
  return (
    <form
      action={path}
      method="get"
      className="mb-6 flex flex-wrap items-end gap-3"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <label htmlFor="q" className="block text-sm font-medium">
          Buscar
        </label>
        <input
          id="q"
          name="q"
          defaultValue={filters.q}
          className={inputClass}
          maxLength={160}
          type="search"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="estado" className="block text-sm font-medium">
          Exibir
        </label>
        <select
          id="estado"
          name="estado"
          defaultValue={filters.estado}
          className={inputClass}
        >
          <option value="ativos">{categories ? "Ativas" : "Ativos"}</option>
          <option value="arquivados">
            {categories ? "Inativas" : "Arquivados"}
          </option>
          <option value="todos">Todos</option>
        </select>
      </div>
      {showStatus && (
        <div className="space-y-2">
          <label htmlFor="status" className="block text-sm font-medium">
            Situação
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filters.status}
            className={inputClass}
          >
            <option value="">Todas</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
      <Button type="submit" variant="outline" className="h-11">
        <Search aria-hidden="true" />
        Filtrar
      </Button>
    </form>
  );
}

export function ListPagination({
  path,
  filters,
  page,
  pages,
  total,
}: {
  path: string;
  filters: AdminFilters;
  page: number;
  pages: number;
  total: number;
}) {
  const href = (target: number) =>
    `${path}?${new URLSearchParams({ q: filters.q, estado: filters.estado, status: filters.status, page: String(target) })}`;
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground">
        {total} registros · Página {page} de {pages}
      </p>
      <nav aria-label="Paginação" className="flex gap-2">
        {page > 1 && (
          <a
            href={href(page - 1)}
            aria-label="Página anterior"
            title="Página anterior"
            className="inline-flex size-10 items-center justify-center rounded-md border focus-visible:outline-2"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </a>
        )}
        {page < pages && (
          <a
            href={href(page + 1)}
            aria-label="Próxima página"
            title="Próxima página"
            className="inline-flex size-10 items-center justify-center rounded-md border focus-visible:outline-2"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </a>
        )}
      </nav>
    </div>
  );
}
