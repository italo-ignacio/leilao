import { Pencil } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  ADMIN_PAGE_SIZE,
  parseAdminFilters,
  type AdminSearchParams,
} from "@/lib/admin-list";
import { RecordControls } from "@/components/admin/record-controls";
import {
  AdminMain,
  ListFilters,
  ListPagination,
  PageHeader,
  tableClass,
} from "@/components/admin/list-layout";

export const instant = false;

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const filters = parseAdminFilters(params);
  const where: Prisma.CategoryWhereInput = {
    active:
      filters.estado === "todos" ? undefined : filters.estado === "ativos",
    ...(filters.q
      ? { name: { contains: filters.q, mode: "insensitive" } }
      : {}),
  };
  const total = await prisma.category.count({ where });
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: ADMIN_PAGE_SIZE,
    skip: (page - 1) * ADMIN_PAGE_SIZE,
    include: { _count: { select: { lots: true } } },
  });
  return (
    <AdminMain>
      <PageHeader
        title="Categorias"
        createHref="/admin/categorias/nova"
        createLabel="Nova categoria"
      />
      {params.salvo === "1" && (
        <p role="status" className="mb-5 text-sm text-primary">
          Categoria salva.
        </p>
      )}
      <ListFilters path="/admin/categorias" filters={filters} categories />
      <div className="overflow-x-auto rounded-md border">
        <table className={tableClass}>
          <caption className="sr-only">Categorias cadastradas</caption>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Slug</th>
              <th>Estado</th>
              <th>Lotes vinculados</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="font-medium">{category.name}</td>
                <td>{category.slug}</td>
                <td>{category.active ? "Ativa" : "Inativa"}</td>
                <td>{category._count.lots}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <a
                      href={`/admin/categorias/${category.id}`}
                      aria-label={`Editar categoria ${category.name}`}
                      title="Editar categoria"
                      className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </a>
                    <RecordControls
                      kind="category"
                      id={category.id}
                      version={category.updatedAt.toISOString()}
                      archived={!category.active}
                      canDelete={category._count.lots === 0}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {!categories.length && (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma categoria encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ListPagination
        path="/admin/categorias"
        filters={filters}
        page={page}
        pages={pages}
        total={total}
      />
    </AdminMain>
  );
}
