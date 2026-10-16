import { randomInt } from "node:crypto";
import sharp from "sharp";
import { expect, test } from "@playwright/test";

test("admin curates categories, auctions, lots and a private image gallery", async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const prefix = `E2E ${process.env.E2E_RUN_ID} ${test.info().project.name}`;
  const categoryName = `${prefix} Categoria`;
  const auctionTitle = `${prefix} Edital`;
  const lotTitle = `${prefix} Lote`;
  const suffix = String(randomInt(100_000, 999_999));
  const officialNumber = `9999998/${suffix}/2099`;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/admin/login");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(process.env.E2E_ADMIN_EMAIL!);
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("complementary", { name: "Aviso importante" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("dashboard.png"),
    fullPage: true,
  });

  await page
    .getByRole("navigation", { name: "Administração" })
    .getByRole("link", { name: "Categorias", exact: true })
    .click();
  await page.getByRole("link", { name: "Nova categoria", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill(categoryName);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByText("Categoria salva.", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Administração" })
    .getByRole("link", { name: "Leilões", exact: true })
    .click();
  await page.getByRole("link", { name: "Novo leilão", exact: true }).click();
  const copiedAuction = `${officialNumber} - SUPERINTENDÊNCIA REGIONAL DA RECEITA FEDERAL DO BRASIL DA 10ª REGIÃO FISCAL\nDisponibilizado\nReceita Federal do Brasil\n\nInício de Propostas:27/10/2099 às 12:00Fim de Propostas:04/11/2099 às 18:00Classificação :05/11/2099 às 10:00Sessão para Lances:05/11/2099 às 14:00`;
  const copiedAuctionHtml = `<p><a href="https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/9999998/${suffix}/2099">${officialNumber} - SUPERINTENDÊNCIA REGIONAL DA RECEITA FEDERAL DO BRASIL DA 10ª REGIÃO FISCAL</a></p>`;
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(
    async ({ text, html }) => {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
    },
    { text: copiedAuction, html: copiedAuctionHtml },
  );
  await page
    .getByRole("button", { name: "Ler dados copiados", exact: true })
    .click();
  await expect(
    page.getByText(/campos preenchidos\. Revise os dados antes de salvar\./),
  ).toBeVisible();
  await expect(
    page.getByLabel("Número do edital", { exact: true }),
  ).toHaveValue(officialNumber);
  await expect(
    page.getByLabel("URL oficial do leilão", { exact: true }),
  ).toHaveValue(
    `https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/9999998/${suffix}/2099`,
  );
  await expect(
    page.getByLabel("Início das propostas", { exact: true }),
  ).toHaveValue("2099-10-27T12:00");
  await expect(
    page.getByLabel("Fim das propostas", { exact: true }),
  ).toHaveValue("2099-11-04T18:00");
  await expect(page.getByLabel("Classificação", { exact: true })).toHaveValue(
    "2099-11-05T10:00",
  );
  await expect(
    page.getByLabel("Início da sessão para lances", { exact: true }),
  ).toHaveValue("2099-11-05T14:00");
  await expect(page.getByLabel("Publicação", { exact: true })).toHaveValue(
    "DRAFT",
  );
  await page
    .getByLabel("Número do edital", { exact: true })
    .fill(officialNumber);
  await page.getByLabel("Título", { exact: true }).fill(auctionTitle);
  await page.getByLabel("Unidade da RFB", { exact: true }).fill("Unidade E2E");
  await page
    .getByLabel("URL oficial do leilão", { exact: true })
    .fill(`https://www.gov.br/e2e/${suffix}`);
  const saveAuctionButton = page.getByRole("button", {
    name: "Salvar",
    exact: true,
  });
  await saveAuctionButton.scrollIntoViewIfNeeded();
  await saveAuctionButton.click();
  await expect(page.getByText("Leilão salvo.", { exact: true })).toBeVisible();
  await page
    .getByLabel("Título", { exact: true })
    .fill(`${auctionTitle} Editado`);
  await page
    .getByLabel("Publicação", { exact: true })
    .selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(
    `${auctionTitle} Editado`,
  );
  await expect(page.getByLabel("Publicação", { exact: true })).toHaveValue(
    "PUBLISHED",
  );
  const auctionId = new URL(page.url()).pathname.split("/").at(-1)!;

  const newLotLink = page.getByRole("link", { name: "Novo lote", exact: true });
  await newLotLink.click();
  await expect(page).toHaveURL(/\/admin\/lotes\/novo\?leilao=/);
  await expect(page.getByLabel("Leilão / edital", { exact: true })).toHaveValue(
    /.+/,
  );
  const copiedLot = `[${officialNumber} - Unidade E2E](https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/9999998/${suffix}/2099)\nDisponibilizado\nReceita Federal do Brasil\n\n![](https://www25.receita.fazenda.gov.br/sle-sociedade/assets/icone-edital-pj.png)\n\nSituação do Lote:\nDisponibilizado\nTipo:\nVIDEOGAME\n\nPreço Mínimo:\nR$ 950,00\n\nMercadorias\nRecinto armazenadorQuant.UnidadeDescriçãoDMA E2E1unCAPACETE DE TESTE////DMA E2E1unVIDEO GAME DE TESTE////`;
  const copiedLotHtml = `<a href="https://www25.receita.fazenda.gov.br/sle-sociedade/portal/edital/9999998/${suffix}/2099">Edital</a><a href="https://www25.receita.fazenda.gov.br/sle-sociedade/portal/lote/${suffix}">Lote</a><img src="https://www25.receita.fazenda.gov.br/sle-sociedade/assets/icone-edital-pj.png"><table><tr><td>Depósito E2E</td><td>1</td><td>un</td><td>CAPACETE DE TESTE</td></tr><tr><td>Depósito E2E</td><td>1</td><td>un</td><td>VIDEO GAME DE TESTE</td></tr></table>`;
  await page.evaluate(
    async ({ text, html }) => {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
    },
    { text: copiedLot, html: copiedLotHtml },
  );
  await page
    .getByRole("button", { name: "Ler dados copiados", exact: true })
    .click();
  await expect(
    page.getByText(/campos preenchidos\. Revise os dados antes de salvar\./),
  ).toBeVisible();
  await expect(page.getByLabel("Leilão / edital", { exact: true })).toHaveValue(
    auctionId,
  );
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(
    "VIDEOGAME",
  );
  await expect(
    page.getByLabel("Preço mínimo (R$)", { exact: true }),
  ).toHaveValue("950,00");
  await expect(
    page.getByLabel("URL oficial do lote", { exact: true }),
  ).toHaveValue(
    `https://www25.receita.fazenda.gov.br/sle-sociedade/portal/lote/${suffix}`,
  );
  await expect(
    page.getByLabel("Recinto armazenador", { exact: true }),
  ).toHaveValue("Depósito E2E");
  await expect(page.getByLabel("Participantes", { exact: true })).toHaveValue(
    "LEGAL_ENTITY",
  );
  await expect(page.getByLabel("Mercadoria 1", { exact: true })).toHaveValue(
    "CAPACETE DE TESTE",
  );
  await expect(page.getByLabel("Mercadoria 2", { exact: true })).toHaveValue(
    "VIDEO GAME DE TESTE",
  );
  await page.getByLabel("Número do lote", { exact: true }).fill("1");
  await page.getByLabel("Título", { exact: true }).fill(lotTitle);
  await page
    .getByLabel("Categoria", { exact: true })
    .selectOption({ label: categoryName });
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Mercadoria de teste E2E");
  await page.getByLabel("Preço mínimo (R$)", { exact: true }).fill("2.069,00");
  await page
    .getByLabel("URL oficial do lote", { exact: true })
    .fill(`https://www.gov.br/e2e/${suffix}/lote/1`);
  await page.getByLabel("Cidade", { exact: true }).fill("Bauru");
  await page
    .getByLabel("Recinto armazenador", { exact: true })
    .fill("Depósito E2E");
  await page
    .getByLabel("Mercadoria 1", { exact: true })
    .fill("Console de teste");
  await page
    .getByLabel("Observações pessoais (privadas)", { exact: true })
    .fill("Nota privada E2E");
  await page
    .getByLabel("Publicação", { exact: true })
    .selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Lote salvo.", { exact: true })).toBeVisible();
  const lotUrl = page.url();
  const lotId = new URL(lotUrl).pathname.split("/").at(-1)!;
  await page.getByLabel("Título", { exact: true }).fill(`${lotTitle} Editado`);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(
    `${lotTitle} Editado`,
  );
  await expect(
    page.getByLabel("Preço mínimo (R$)", { exact: true }),
  ).toHaveValue("2069,00");

  await page
    .getByLabel("Publicação", { exact: true })
    .selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Lote salvo.", { exact: true })).toBeVisible();
  await page.goto(`/lotes?q=${encodeURIComponent(`${lotTitle} Editado`)}`);
  const merchandiseButton = page.getByRole("button", {
    name: "Ver 2 mercadorias do lote 1",
    exact: true,
  });
  await expect(merchandiseButton).toBeVisible();
  await merchandiseButton.click();
  const merchandiseDialog = page.getByRole("dialog");
  await expect(
    merchandiseDialog.getByRole("heading", { name: "Mercadorias" }),
  ).toBeVisible();
  await expect(
    merchandiseDialog.getByText("Console de teste", { exact: true }),
  ).toBeVisible();
  await expect(
    merchandiseDialog.getByText("1 un", { exact: true }),
  ).toHaveCount(2);
  await merchandiseDialog
    .getByRole("button", { name: "Fechar mercadorias" })
    .click();
  await expect(merchandiseDialog).toHaveCount(0);

  await page.goto("/");
  const homeLotCard = page
    .getByRole("region", { name: "Adicionados recentemente", exact: true })
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: `${lotTitle} Editado`,
        exact: true,
      }),
    });
  await homeLotCard
    .getByRole("button", { name: "Ver 2 mercadorias do lote 1", exact: true })
    .click();
  await expect(
    homeLotCard
      .getByRole("dialog")
      .getByText("Console de teste", { exact: true }),
  ).toBeVisible();
  await homeLotCard
    .getByRole("button", { name: "Fechar mercadorias", exact: true })
    .click();
  await expect(homeLotCard.getByRole("dialog")).toHaveCount(0);

  await page.goto(`/admin/lotes/${lotId}`);
  await page.getByLabel("Publicação", { exact: true }).selectOption("DRAFT");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Lote salvo.", { exact: true })).toBeVisible();
  await page.goto(`/admin/leiloes/${auctionId}`);
  await page.getByLabel("Publicação", { exact: true }).selectOption("DRAFT");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Leilão salvo.", { exact: true })).toBeVisible();
  await page.goto(`/admin/lotes/${lotId}`);

  const red = await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#a83232" },
  })
    .png()
    .toBuffer();
  const green = await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#257b4c" },
  })
    .png()
    .toBuffer();
  console.log(
    "E2E_FILE_INPUT",
    JSON.stringify({
      count: await page.locator('input[type="file"]').count(),
      labels: await page.locator('input[type="file"]').evaluateAll((elements) =>
        elements.map((element) => ({
          id: element.id,
          type: element.getAttribute("type"),
          disabled: (element as HTMLInputElement).disabled,
          visible: element.getClientRects().length > 0,
        })),
      ),
    }),
  );
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page
    .getByLabel("JPEG, PNG ou WebP · até 5 MB por arquivo", { exact: true })
    .click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles([
    { name: "first.png", mimeType: "image/png", buffer: red },
    { name: "second.png", mimeType: "image/png", buffer: green },
  ]);
  await page
    .getByRole("button", { name: "Enviar imagens", exact: true })
    .click();
  await expect(
    page.getByText("Imagens salvas.", { exact: true }),
  ).toBeVisible();
  const gallery = page.locator('section[aria-labelledby="images-title"]');
  await expect(gallery.getByRole("img")).toHaveCount(2);
  await page
    .getByLabel("Adicionar imagem por link", { exact: true })
    .fill("https://127.0.0.1/image.jpg");
  await page
    .getByRole("button", { name: "Importar imagem", exact: true })
    .click();
  await expect(
    page.getByRole("alert", { name: "Erro na galeria" }),
  ).toContainText("link HTTPS direto de uma imagem em um site público");
  const imagePath = await gallery.getByRole("img").first().getAttribute("src");
  expect(imagePath).toBeTruthy();
  const authenticatedImage = await page.request.get(imagePath!);
  expect(authenticatedImage.status()).toBe(200);
  expect(authenticatedImage.headers()["content-type"]).toBe("image/webp");
  expect((await request.get(imagePath!)).status()).toBe(404);
  const badUpload = await page.request.post(`/api/admin/lots/${lotId}/images`, {
    headers: { origin: baseURL! },
    multipart: {
      images: {
        name: "bad.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from("<svg/>"),
      },
    },
  });
  expect(badUpload.status()).toBe(400);
  await page
    .getByLabel("Descrição da imagem 1", { exact: true })
    .fill("Foto E2E da capa");
  await page
    .getByRole("button", { name: "Salvar descrição da imagem 1", exact: true })
    .click();
  await expect(gallery.getByRole("img").first()).toHaveAttribute(
    "alt",
    "Foto E2E da capa",
  );
  await page
    .getByRole("button", { name: "Mover imagem 1 para baixo", exact: true })
    .click();
  await expect(gallery.getByRole("img").nth(1)).toHaveAttribute(
    "alt",
    "Foto E2E da capa",
  );
  await page.screenshot({
    path: test.info().outputPath("lot-edit.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Remover imagem 1", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(gallery.getByRole("img")).toHaveCount(1);

  await page
    .getByRole("navigation", { name: "Administração" })
    .getByRole("link", { name: "Lotes", exact: true })
    .click();
  await page.getByLabel("Buscar", { exact: true }).fill(`${lotTitle} Editado`);
  await page.getByRole("button", { name: "Filtrar", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "R$ 2.069,00", exact: true }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
  await page.screenshot({
    path: test.info().outputPath("lots-list.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Arquivar registro", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(
    page.getByText("Nenhum lote encontrado.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Exibir", { exact: true }).selectOption("arquivados");
  await page.getByRole("button", { name: "Filtrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Restaurar registro", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(
    page.getByText("Nenhum lote encontrado.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Exibir", { exact: true }).selectOption("ativos");
  await page.getByRole("button", { name: "Filtrar", exact: true }).click();
  await expect(
    page.getByText(`${lotTitle} Editado`, { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Administração" })
    .getByRole("link", { name: "Categorias", exact: true })
    .click();
  await page.getByLabel("Buscar", { exact: true }).fill(categoryName);
  await page.getByRole("button", { name: "Filtrar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Excluir categoria", exact: true }),
  ).toBeDisabled();
  expect(pageErrors).toEqual([]);
});

test("image uploads require authentication and same origin", async ({
  request,
  baseURL,
}) => {
  const path = "/api/admin/lots/not-a-real-id/images";
  expect(
    (
      await request.post(path, { headers: { origin: "https://evil.test" } })
    ).status(),
  ).toBe(403);
  expect(
    (await request.post(path, { headers: { origin: baseURL! } })).status(),
  ).toBe(401);
});
