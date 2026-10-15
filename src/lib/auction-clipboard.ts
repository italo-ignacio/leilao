import type { AuctionFormValues } from "./admin-schemas";

export type AuctionClipboardValues = Partial<
  Pick<
    AuctionFormValues,
    | "officialNumber"
    | "title"
    | "agency"
    | "unit"
    | "officialUrl"
    | "sourceStatus"
    | "proposalStartsAt"
    | "proposalEndsAt"
    | "classificationAt"
    | "biddingStartsAt"
  >
>;

const sourceStatuses = new Set([
  "disponibilizado",
  "disponibilizada",
  "publicado",
  "publicada",
  "suspenso",
  "suspensa",
  "cancelado",
  "cancelada",
  "encerrado",
  "encerrada",
]);

function parseLocalDateTime(value: string): string {
  const match = value
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(?:às|as)\s+(\d{2}):(\d{2})$/i);
  if (!match) throw new Error(`Data do edital inválida: ${value.trim()}`);

  const [, day, month, year, hour, minute] = match;
  const parsed = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ),
  );
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day) ||
    Number(hour) > 23 ||
    Number(minute) > 59
  ) {
    throw new Error(`Data do edital inválida: ${value.trim()}`);
  }

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function findDate(text: string, label: RegExp): string | undefined {
  const match = text.match(
    new RegExp(
      `${label.source}\\s*:\\s*(\\d{2}\\/\\d{2}\\/\\d{4}\\s+(?:às|as)\\s+\\d{2}:\\d{2})`,
      "i",
    ),
  );
  return match?.[1] ? parseLocalDateTime(match[1]) : undefined;
}

export function extractOfficialAuctionUrlsFromHtml(html: string): string[] {
  if (!html.trim()) return [];
  if (html.length > 100_000)
    throw new Error("O conteúdo HTML copiado excede o limite permitido.");

  const document = new DOMParser().parseFromString(html, "text/html");
  return Array.from(document.querySelectorAll("a[href]"))
    .map((anchor) => anchor.getAttribute("href"))
    .flatMap((href) => {
      if (!href) return [];
      try {
        const url = new URL(href, "https://www25.receita.fazenda.gov.br");
        if (
          url.protocol !== "https:" ||
          url.hostname !== "www25.receita.fazenda.gov.br" ||
          url.username ||
          url.password ||
          url.port ||
          url.search ||
          url.hash ||
          !/^\/sle-sociedade\/portal\/edital\/\d{7}\/\d{1,6}\/\d{4}\/?$/.test(
            url.pathname,
          )
        ) {
          return [];
        }
        return [url.toString()];
      } catch {
        return [];
      }
    });
}

export function parseOfficialAuctionClipboard(
  text: string,
  html = "",
): AuctionClipboardValues {
  if (!text.trim() || text.length > 20_000)
    throw new Error("Área de transferência vazia ou maior que o limite.");

  const header = text.match(
    /^\s*\[?(\d{7}\/\d{6}\/\d{4})\s*-\s*([^\]\r\n]+?)\]?(?:\s*\((https:\/\/[^)\s]+)\))?\s*$/m,
  );
  if (!header)
    throw new Error(
      "Não encontrei o número do edital e a unidade no texto copiado.",
    );

  const officialNumber = header[1];
  const unit = header[2].trim();
  const officialUrl =
    header[3] ??
    text.match(/https:\/\/www25\.receita\.fazenda\.gov\.br\/[^\s)]+/)?.[0] ??
    extractOfficialAuctionUrlsFromHtml(html)[0];
  if (!officialUrl) throw new Error("Não encontrei o link oficial do edital.");

  let url: URL;
  try {
    url = new URL(officialUrl);
  } catch {
    throw new Error("O link oficial do edital é inválido.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "www25.receita.fazenda.gov.br" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "O link deve pertencer ao portal oficial de leilões da Receita.",
    );
  }

  const path = url.pathname.match(
    /^\/sle-sociedade\/portal\/edital\/(\d{7})\/(\d{1,6})\/(\d{4})\/?$/,
  );
  const [numberUnit, numberAuction, numberYear] = officialNumber.split("/");
  if (
    !path ||
    path[1] !== numberUnit ||
    path[2].padStart(6, "0") !== numberAuction ||
    path[3] !== numberYear
  ) {
    throw new Error("O link oficial não corresponde ao número do edital.");
  }

  const values: AuctionClipboardValues = {
    officialNumber,
    title: `Edital ${officialNumber}`,
    unit,
    officialUrl: url.toString(),
  };

  if (/^Receita Federal do Brasil$/im.test(text))
    values.agency = "Receita Federal do Brasil";

  const sourceStatus = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => sourceStatuses.has(line.toLocaleLowerCase("pt-BR")));
  if (sourceStatus) values.sourceStatus = sourceStatus;

  const dates: [keyof AuctionClipboardValues, RegExp][] = [
    ["proposalStartsAt", /In[ií]cio\s+de\s+Propostas/],
    ["proposalEndsAt", /Fim\s+de\s+Propostas/],
    ["classificationAt", /Classifica[cç][aã]o/],
    ["biddingStartsAt", /Sess[aã]o\s+para\s+Lances/],
  ];
  for (const [field, label] of dates) {
    const value = findDate(text, label);
    if (value) Object.assign(values, { [field]: value });
  }

  return values;
}
