import { expect, test } from "@playwright/test";

test("anonymous visitors are redirected to login, including nested admin paths", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(
    page.getByRole("heading", { name: "Acesso administrativo" }),
  ).toBeVisible();
  await page.goto("/admin/leiloes");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("login form is accessible, responsive and validates input", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin/login");
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  await page
    .getByLabel("Senha", { exact: true })
    .fill("test-password-visibility");
  await page
    .getByRole("button", { name: "Mostrar senha", exact: true })
    .click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Ocultar senha", exact: true })
    .click();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await page.screenshot({
    path: test.info().outputPath("login.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("admin can log in, access the protected page and log out", async ({
  page,
  context,
}) => {
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
    page.getByRole("heading", { name: "Administração", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(process.env.E2E_ADMIN_EMAIL!, { exact: true }),
  ).toBeVisible();
  const cookies = await context.cookies();
  const session = cookies.find((cookie) =>
    cookie.name.endsWith("authjs.session-token"),
  );
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  await page.screenshot({
    path: test.info().outputPath("admin.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("wrong passwords, viewer accounts and inactive admins receive the same error", async ({
  page,
}) => {
  const cases = [
    {
      email: process.env.E2E_ADMIN_EMAIL!,
      password: "incorrect-password-for-test",
    },
    {
      email: process.env.E2E_VIEWER_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    },
    {
      email: process.env.E2E_INACTIVE_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    },
  ];
  for (const credentials of cases) {
    await page.goto("/admin/login");
    await page.getByLabel("E-mail", { exact: true }).fill(credentials.email);
    await page.getByLabel("Senha", { exact: true }).fill(credentials.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(
      page.getByRole("alert", { name: "Falha no login" }),
    ).toHaveText(
      "Não foi possível entrar. Confira suas credenciais ou aguarde antes de tentar novamente.",
    );
    await expect(page).toHaveURL(/\/admin\/login$/);
  }
});

test("auth endpoints reject cross-origin POST and require CSRF for direct callbacks", async ({
  request,
  baseURL,
}) => {
  const rejected = await request.post("/api/auth/callback/credentials", {
    headers: { origin: "https://evil.example.test" },
    form: {
      email: "invalid@example.test",
      password: "incorrect-test-password",
    },
  });
  expect(rejected.status()).toBe(403);
  const missingToken = await request.post("/api/auth/callback/credentials", {
    headers: { origin: baseURL!, "X-Auth-Return-Redirect": "1" },
    form: {
      email: process.env.E2E_ADMIN_EMAIL!,
      password: process.env.E2E_ADMIN_PASSWORD!,
    },
  });
  expect(missingToken.headers()["set-cookie"] ?? "").not.toContain(
    "authjs.session-token",
  );
  const protectedPage = await request.get("/admin", { maxRedirects: 0 });
  expect([302, 303, 307, 308]).toContain(protectedPage.status());
  expect(protectedPage.headers().location).toContain("/admin/login");
});
