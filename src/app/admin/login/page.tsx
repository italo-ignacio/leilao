import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { getCurrentAdmin } from "@/lib/admin-auth";

async function LoginContent() {
  if (await getCurrentAdmin()) redirect("/admin");
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-6xl flex-1 items-start justify-center px-5 py-12 outline-none sm:px-8 sm:py-16"
    >
      <section aria-labelledby="login-title" className="w-full max-w-sm">
        <LockKeyhole aria-hidden="true" className="mb-5 size-7 text-primary" />
        <h1 id="login-title" className="text-2xl font-bold">
          Acesso administrativo
        </h1>
        <Suspense
          fallback={
            <p role="status" className="mt-8 text-sm text-muted-foreground">
              Carregando...
            </p>
          }
        >
          <LoginContent />
        </Suspense>
      </section>
    </main>
  );
}
