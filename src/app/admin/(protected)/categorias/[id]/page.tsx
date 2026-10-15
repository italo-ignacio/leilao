import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recordIdSchema } from "@/lib/admin-schemas";
import { CategoryForm } from "@/components/admin/category-form";
import { AdminMain, PageHeader } from "@/components/admin/list-layout";

export const instant = false;

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const parsed = recordIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const category = await prisma.category.findUnique({
    where: { id: parsed.data },
  });
  if (!category) notFound();
  return (
    <AdminMain>
      <PageHeader title="Editar categoria" backHref="/admin/categorias" />
      <CategoryForm
        key={category.updatedAt.toISOString()}
        id={category.id}
        initial={{
          version: category.updatedAt.toISOString(),
          name: category.name,
          active: category.active,
        }}
      />
    </AdminMain>
  );
}
