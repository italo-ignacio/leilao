import { requireAdmin } from "@/lib/admin-auth";
import { CategoryForm } from "@/components/admin/category-form";
import { AdminMain, PageHeader } from "@/components/admin/list-layout";

export const instant = false;

export default async function NewCategoryPage() {
  await requireAdmin();
  return (
    <AdminMain>
      <PageHeader title="Nova categoria" backHref="/admin/categorias" />
      <CategoryForm
        id={null}
        initial={{ version: "", name: "", active: true }}
      />
    </AdminMain>
  );
}
