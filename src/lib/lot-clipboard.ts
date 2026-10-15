import type { LotFormValues } from "./admin-schemas";
import { parseOfficialAuctionClipboard } from "./auction-clipboard";

type LotItem = LotFormValues["items"][number];

export type LotClipboardValues = Partial<
  Pick<
    LotFormValues,
    | "number"
    | "title"
    | "description"
    | "minimumBid"
    | "storageFacility"
    | "officialUrl"
    | "sourceStatus"
    | "participationType"
    | "items"
  >
> & { auctionOfficialNumber?: string };

const itemRowPattern =
  /^(.+?)(\d+(?:[.,]\d{1,3})?)\s*(un(?:id(?:ade)?)?\.?|kg|g|mg|l|ml|m|m²|m³|cm|par|cx|caixa|pc|peças?)\s*(.+)$/i;

function parseItemsFromHtml(html: string): {
  items: LotItem[];
  facilities: string[];
} {
  if (!html) return { items: [], facilities: [] };
  const document = new DOMParser().parseFromString(html, "text/html");
  const items: LotItem[] = [];
  const facilities: string[] = [];

  for (const row of document.querySelectorAll("tr")) {
    const cells = Array.from(
      row.querySelectorAll("th, td"),
      (cell) => cell.textContent?.trim() ?? "",
    );
    if (cells.length < 4 || !/^\d+(?:[.,]\d{1,3})?$/.test(cells[1])) continue;
    facilities.push(cells[0]);
    items.push({
      quantity: cells[1],
      unit: cells[2],
      description: cells.slice(3).filter(Boolean).join(" "),
    });
  }

  return { items, facilities };
}

function parseItemsFromText(text: string): {
  items: LotItem[];
  facilities: string[];
} {
  const section = text.match(/Mercadorias\s*([\s\S]*)/i)?.[1] ?? "";
  const rows = section
    .replace(
      /^\s*Recinto\s+armazenador\s*Quant\.?\s*Unidade\s*Descri[cç][aã]o\s*/i,
      "",
    )
    .split(/\/{2,}|\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  const items: LotItem[] = [];
  const facilities: string[] = [];

  for (const row of rows) {
    const match = row.match(itemRowPattern);
    if (!match) continue;
    facilities.push(match[1].trim());
    items.push({
      quantity: match[2],
      unit: match[3].replace(/\.$/, ""),
      description: match[4].trim(),
    });
  }

  return { items, facilities };
}

function findLotUrl(text: string, html: string): string | undefined {
  const links = [
    ...Array.from(
      html
        ? new DOMParser()
            .parseFromString(html, "text/html")
            .querySelectorAll("a[href]")
        : [],
      (anchor) => anchor.getAttribute("href") ?? "",
    ),
    ...(text.match(/https?:\/\/[^\s)]+/g) ?? []),
  ];

  for (const link of links) {
    try {
      const url = new URL(link, "https://www25.receita.fazenda.gov.br");
      if (
        url.protocol === "https:" &&
        url.hostname === "www25.receita.fazenda.gov.br" &&
        !url.username &&
        !url.password &&
        !url.port &&
        /(?:^|\/)lotes?\//i.test(url.pathname)
      ) {
        return url.toString();
      }
    } catch {
      continue;
    }
  }
}

export function parseOfficialLotClipboard(
  text: string,
  html = "",
): LotClipboardValues {
  if (!text.trim() || text.length > 20_000)
    throw new Error("Área de transferência vazia ou maior que o limite.");
  if (html.length > 100_000)
    throw new Error("O conteúdo HTML copiado excede o limite permitido.");

  const auction = parseOfficialAuctionClipboard(text, html);
  const lotNumber = text.match(
    /(?:n[uú]mero\s+(?:do\s+)?lote|lote)\s*[:#]\s*([1-9]\d{0,8})/i,
  )?.[1];
  const type = text.match(/(?:^|\n)\s*Tipo\s*:\s*([^\r\n]+)/i)?.[1]?.trim();
  const sourceStatus = text
    .match(/Situa[cç][aã]o\s+do\s+Lote\s*:\s*([^\r\n]+)/i)?.[1]
    ?.trim();
  const price = text.match(
    /Pre[cç]o\s+M[ií]nimo\s*:\s*R\$\s*((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?)/i,
  )?.[1];
  const htmlItems = parseItemsFromHtml(html);
  const textItems = parseItemsFromText(text);
  const items = htmlItems.items.length ? htmlItems : textItems;
  const participationText = `${text}\n${html}`;
  let participationType: LotClipboardValues["participationType"];
  if (/icone-edital-pf-pj\.png/i.test(participationText))
    participationType = "INDIVIDUAL_AND_LEGAL_ENTITY";
  else if (/icone-edital-pj\.png/i.test(participationText))
    participationType = "LEGAL_ENTITY";

  const title = type
    ? lotNumber
      ? `Lote ${lotNumber} - ${type}`
      : type
    : undefined;
  const description = [
    type ? `Tipo: ${type}` : "",
    items.items.length
      ? `Mercadorias:\n${items.items
          .map((item) => `- ${item.quantity} ${item.unit}: ${item.description}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const result: LotClipboardValues = {
    auctionOfficialNumber: auction.officialNumber,
    ...(lotNumber ? { number: lotNumber } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(price ? { minimumBid: price } : {}),
    ...(items.facilities[0] ? { storageFacility: items.facilities[0] } : {}),
    ...(sourceStatus ? { sourceStatus } : {}),
    ...(participationType ? { participationType } : {}),
    ...(items.items.length ? { items: items.items } : {}),
  };
  const officialUrl = findLotUrl(text, html);
  if (officialUrl) result.officialUrl = officialUrl;

  return result;
}
