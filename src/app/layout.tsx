import type { Metadata } from "next";
import "@fontsource-variable/public-sans";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Leilões RFB | Catálogo independente",
    template: "%s | Leilões RFB",
  },
  description:
    "Catálogo independente de leilões e lotes da Receita Federal, com curadoria manual. Confira sempre o edital oficial.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Leilões RFB",
    title: "Leilões RFB | Catálogo independente",
    description:
      "Lotes selecionados da Receita Federal. Consulte sempre o edital oficial.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
