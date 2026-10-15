import { describe, expect, it } from "vitest";
import {
  dateRangeBounds,
  parsePublicCatalogFilters,
} from "./public-catalog-filters";

describe("public catalog filters", () => {
  it("parses supported filters and safely normalizes repeated query parameters", () => {
    expect(
      parsePublicCatalogFilters({
        q: [" notebook ", "ignored"],
        uf: "SP",
        valorMin: "100,50",
        page: "2",
      }),
    ).toMatchObject({
      q: "notebook",
      uf: "SP",
      valorMin: "100.50",
      page: 2,
      ordenar: "recentes",
    });
  });

  it("falls back to safe defaults for malformed filters", () => {
    expect(
      parsePublicCatalogFilters({
        uf: "XX",
        valorMin: "1e6",
        page: "-8",
        ordenar: "raw-sql",
      }),
    ).toMatchObject({
      uf: "",
      valorMin: "",
      page: 1,
      ordenar: "recentes",
    });
  });

  it("rejects inverted prices and dates as a whole filter set", () => {
    expect(
      parsePublicCatalogFilters({ valorMin: "200", valorMax: "100" }).valorMin,
    ).toBe("");
    expect(
      parsePublicCatalogFilters({ dataDe: "2026-12-02", dataAte: "2026-12-01" })
        .dataDe,
    ).toBe("");
  });

  it("uses inclusive date-only bounds without local timezone dependence", () => {
    const bounds = dateRangeBounds({
      dataDe: "2026-11-01",
      dataAte: "2026-11-30",
    });
    expect(bounds.gte?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(bounds.lt?.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});
