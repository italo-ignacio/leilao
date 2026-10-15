import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const instant = false;

async function ProtectedContent({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <>
      <AdminNav email={admin.email ?? "Administrador"} />
      {children}
    </>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main
          id="conteudo"
          className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8"
        >
          <p role="status">Carregando...</p>
        </main>
      }
    >
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}
