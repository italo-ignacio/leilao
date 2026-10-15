import { describe, expect, it } from "vitest";
import { parseOfficialLotClipboard } from "./lot-clipboard";

const copiedLot = `[1000100/000005/2026 - SUPERINTENDÊNCIA REGIONAL DA RECEITA FEDERAL DO BRASIL DA 10ª REGIÃO FISCAL](https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/1000100/5/2026)
Disponibilizado
Receita Federal do Brasil

![](https://www25.receita.fazenda.gov.br/sle-sociedade/assets/icone-edital-pj.png)

Situação do Lote:
Disponibilizado
Tipo:
VIDEOGAME

Preço Mínimo:
R$ 950,00

Mercadorias
Recinto armazenadorQuant.UnidadeDescriçãoDMA SANTO ÂNGelo1unCAPACETE AUTO KING HOMEM DE FERRO MARK V - PRETO ORIGEM CHINA////DMA SANTO ÂNGelo1unVIDEO GAME SONY PS5 1TB EDICAO DIGITAL ORIGEM/PROCED ESTRANGEIRA////`;

describe("official lot clipboard parser", () => {
  it("extracts lot fields, merchandise and participation from the copied format", () => {
    expect(parseOfficialLotClipboard(copiedLot)).toMatchObject({
      auctionOfficialNumber: "1000100/000005/2026",
      title: "VIDEOGAME",
      description: expect.stringContaining("VIDEO GAME SONY PS5 1TB"),
      minimumBid: "950,00",
      storageFacility: "DMA SANTO ÂNGelo",
      sourceStatus: "Disponibilizado",
      participationType: "LEGAL_ENTITY",
      items: [
        {
          quantity: "1",
          unit: "un",
          description:
            "CAPACETE AUTO KING HOMEM DE FERRO MARK V - PRETO ORIGEM CHINA",
        },
        {
          quantity: "1",
          unit: "un",
          description:
            "VIDEO GAME SONY PS5 1TB EDICAO DIGITAL ORIGEM/PROCED ESTRANGEIRA",
        },
      ],
    });
    expect(parseOfficialLotClipboard(copiedLot)).not.toHaveProperty(
      "officialUrl",
    );
  });

  it("extracts a lot-specific URL from HTML without using its auction link", () => {
    const text = copiedLot.replace(
      "![](https://www25.receita.fazenda.gov.br/sle-sociedade/assets/icone-edital-pj.png)",
      "",
    );
    const html = `<a href="https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/1000100/5/2026">Edital</a><img src="https://www25.receita.fazenda.gov.br/sle-sociedade/assets/icone-edital-pj.png"><a href="https://www25.receita.fazenda.gov.br/sle-sociedade/portal/lote/123">Lote</a>`;

    expect(parseOfficialLotClipboard(text, html)).toMatchObject({
      officialUrl:
        "https://www25.receita.fazenda.gov.br/sle-sociedade/portal/lote/123",
      participationType: "LEGAL_ENTITY",
    });
  });

  it("does not use unrelated or non-official links as the lot URL", () => {
    const html = `<a href="https://example.test/lote/123">Lote</a>`;

    expect(parseOfficialLotClipboard(copiedLot, html)).not.toHaveProperty(
      "officialUrl",
    );
  });

  it("parses a provided lot number and a mixed participant icon", () => {
    const text = copiedLot.replace(
      "Situação do Lote:",
      "Número do Lote: 5\nSituação do Lote:",
    );
    const html = `<img src="/sle-sociedade/assets/icone-edital-pf-pj.png">`;

    expect(parseOfficialLotClipboard(text, html)).toMatchObject({
      number: "5",
      title: "Lote 5 - VIDEOGAME",
      participationType: "INDIVIDUAL_AND_LEGAL_ENTITY",
    });
  });
});
