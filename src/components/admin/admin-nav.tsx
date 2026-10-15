"use client";

import { usePathname } from "next/navigation";
import { Boxes, Gavel, LayoutDashboard, LogOut, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/admin/actions";

const links = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/leiloes", label: "Leilões", icon: Gavel },
  { href: "/admin/lotes", label: "Lotes", icon: Boxes },
  { href: "/admin/categorias", label: "Categorias", icon: Tags },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  return (
    <div className="border-b bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:px-8">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="min-w-0 text-xs break-all text-muted-foreground">
            {email}
          </p>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className="h-10">
              <LogOut aria-hidden="true" />
              Sair
            </Button>
          </form>
        </div>
        <nav aria-label="Administração" className="flex flex-wrap gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const selected =
              href === "/admin" ? pathname === href : pathname.startsWith(href);
            return (
              <a
                key={href}
                href={href}
                aria-current={selected ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${selected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
