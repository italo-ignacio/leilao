import { describe, expect, it } from "vitest";
import { parseOfficialAuctionClipboard } from "./auction-clipboard";

const copiedAuction = `[1000100/000005/2026 - SUPERINTENDÊNCIA REGIONAL DA RECEITA FEDERAL DO BRASIL DA 10ª REGIÃO FISCAL](https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/1000100/5/2026)
Disponibilizado
Receita Federal do Brasil

Início de Propostas:27/10/2026 às 12:00Fim de Propostas:04/11/2026 às 18:00Classificação :05/11/2026 às 10:00Sessão para Lances:05/11/2026 às 14:00`;

describe("official auction clipboard parser", () => {
  it("extracts the official number, unit, status, and proposal dates", () => {
    expect(parseOfficialAuctionClipboard(copiedAuction)).toEqual({
      officialNumber: "1000100/000005/2026",
      title: "Edital 1000100/000005/2026",
      unit: "SUPERINTENDÊNCIA REGIONAL DA RECEITA FEDERAL DO BRASIL DA 10ª REGIÃO FISCAL",
      officialUrl:
        "https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/1000100/5/2026",
      agency: "Receita Federal do Brasil",
      sourceStatus: "Disponibilizado",
      proposalStartsAt: "2026-10-27T12:00",
      proposalEndsAt: "2026-11-04T18:00",
      classificationAt: "2026-11-05T10:00",
      biddingStartsAt: "2026-11-05T14:00",
    });
  });

  it("supports a URL on its own line and omits dates not present in the copy", () => {
    const text = `1000100/000005/2026 - Unidade RFB\nhttps://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/1000100/5/2026\nDisponibilizado`;
    expect(parseOfficialAuctionClipboard(text)).toMatchObject({
      officialNumber: "1000100/000005/2026",
      unit: "Unidade RFB",
      sourceStatus: "Disponibilizado",
    });
    expect(parseOfficialAuctionClipboard(text)).not.toHaveProperty(
      "proposalStartsAt",
    );
  });

  it("gets the official auction link from copied HTML anchors", () => {
    const text = `1000100/000005/2026 - Unidade RFB\nDisponibilizado`;
    const html = `<p><a href="https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/1000100/5/2026">Consultar edital</a></p>`;

    expect(parseOfficialAuctionClipboard(text, html)).toMatchObject({
      officialNumber: "1000100/000005/2026",
      officialUrl:
        "https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/1000100/5/2026",
    });
  });

  it("ignores unrelated and non-official links in copied HTML", () => {
    const text = `1000100/000005/2026 - Unidade RFB`;
    const html = `<a href="https://example.test/edital">Edital</a>`;

    expect(() => parseOfficialAuctionClipboard(text, html)).toThrow(
      "Não encontrei o link oficial do edital.",
    );
  });

  it.each([
    "",
    "conteúdo sem edital",
    copiedAuction.replace("/5/2026)", "/6/2026)"),
    copiedAuction.replace("www25.receita.fazenda.gov.br", "example.test"),
    copiedAuction.replace("27/10/2026 às 12:00", "31/02/2026 às 12:00"),
    copiedAuction
      .replace("04/11/2026 às 18:00", "04/11/2026 às 18:00")
      .replace(
        "https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/1000100/5/2026",
        "https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/1000100/5/2026?next=https://evil.test",
      ),
  ])("rejects invalid or mismatched clipboard data", (text) => {
    expect(() => parseOfficialAuctionClipboard(text)).toThrow();
  });
});
