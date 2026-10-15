import { describe, expect, it } from "vitest";
import { clampCatalogPage } from "./public-catalog-filters";

describe("public catalog pagination", () => {
  it("keeps page numbers within the current result range", () => {
    expect(clampCatalogPage(1, 0)).toEqual({ page: 1, pages: 1 });
    expect(clampCatalogPage(4, 37)).toEqual({ page: 4, pages: 4 });
    expect(clampCatalogPage(99, 37)).toEqual({ page: 4, pages: 4 });
  });

  it("uses a stable page size for zero and partial final pages", () => {
    expect(clampCatalogPage(1, 12, 12)).toEqual({ page: 1, pages: 1 });
    expect(clampCatalogPage(2, 13, 12)).toEqual({ page: 2, pages: 2 });
  });
});
