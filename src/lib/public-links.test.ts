import { describe, expect, it } from "vitest";
import { safeOfficialUrl } from "./public-links";

describe("safe official URLs", () => {
  it("allows HTTPS URLs and rejects active or credentialed URLs", () => {
    expect(safeOfficialUrl("https://www25.receita.fazenda.gov.br/leilao")).toBe(
      "https://www25.receita.fazenda.gov.br/leilao",
    );
    expect(safeOfficialUrl("javascript:alert(1)")).toBeNull();
    expect(safeOfficialUrl("http://example.com")).toBeNull();
    expect(safeOfficialUrl("https://user:pass@example.com")).toBeNull();
    expect(safeOfficialUrl(undefined)).toBeNull();
  });
});
