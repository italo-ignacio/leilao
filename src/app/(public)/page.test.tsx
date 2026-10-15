import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CatalogHome } from "@/components/public/catalog-home";

const emptyData = {
  openCount: 0,
  openAuctionCount: 0,
  closingSoonCount: 0,
  publishedCount: 0,
  open: [],
  closingSoon: [],
  latest: [],
};

describe("Home", () => {
  it("renders an honest empty catalog and points to the official source", () => {
    render(<CatalogHome data={emptyData} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Leilões RFB" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Nenhum lote publicado no momento. Consulte a fonte oficial para verificar novos editais.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Explorar lotes" }),
    ).toHaveAttribute("href", "/lotes");
  });
});
