import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";

async function expectCatalogHasPublicContent(
  page: import("@playwright/test").Page,
) {
  const summary = page.getByRole("region", { name: "Resumo dos leilões" });
  const publishedCount = Number(
    await summary.locator("p.tabular-nums").nth(2).innerText(),
  );
  expect(publishedCount).toBeGreaterThanOrEqual(0);
  if (publishedCount === 0) {
    await expect(
      page.getByText(
        "Nenhum lote publicado no momento. Consulte a fonte oficial para verificar novos editais.",
      ),
    ).toBeVisible();
  } else {
    await expect(page.getByRole("article").first()).toBeVisible();
  }
}

test("public catalog is accessible and has no horizontal overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("Leilões RFB | Catálogo independente");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(
    page.getByRole("heading", { level: 1, name: "Leilões RFB" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Aviso importante" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Confira as informações no edital oficial/),
  ).toBeVisible();
  await expectCatalogHasPublicContent(page);
  await expect(page.getByRole("link", { name: "Favoritos" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await page.screenshot({
    path: test.info().outputPath("catalog.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("theme selection persists after reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({
    path: test.info().outputPath("catalog-dark.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Ativar tema claro" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("keyboard navigation can skip directly to content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Pular para o conteúdo" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});

test("missing pages keep the disclaimer and offer a return to the catalog", async ({
  page,
}) => {
  const response = await page.goto("/pagina-inexistente");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Aviso importante" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao catálogo" }).click();
  await expectCatalogHasPublicContent(page);
});

test("public catalog filters are reflected in the URL and expose SEO routes", async ({
  page,
  request,
}) => {
  await page.goto("/lotes");
  await expect(
    page.getByRole("heading", { name: "Lotes", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Buscar lotes", { exact: true }).fill("switch 2");
  await page.getByLabel("UF", { exact: true }).selectOption("SP");
  await page
    .getByLabel("Lance mínimo a partir de", { exact: true })
    .fill("824,00");
  await page
    .getByLabel("Ordenar por", { exact: true })
    .selectOption("preco-menor");
  await page
    .getByRole("button", { name: "Filtrar lotes", exact: true })
    .click();
  await expect(page).toHaveURL(/q=switch(?:\+|%20)2/);
  await expect(page).toHaveURL(/uf=SP/);
  await expect(page).toHaveURL(/valorMin=824%2C00/);
  await expect(page).toHaveURL(/ordenar=preco-menor/);

  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /admin");
  expect(await robots.text()).toContain("Sitemap:");
  const sitemap = await request.get("/sitemap/0.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("sitemap");
});

test("unknown lot slugs are not exposed as public details", async ({
  page,
}) => {
  const response = await page.goto(
    `/lotes/lote-inexistente-${randomBytes(6).toString("hex")}`,
  );
  expect(response).not.toBeNull();
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );
});
