const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function validateTestDatabaseUrl(
  databaseUrl: string,
  allowRemoteDatabase?: string,
): string {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("A URL do banco de teste é inválida.");
  }
  if (!["postgresql:", "postgres:"].includes(url.protocol)) {
    throw new Error("Os testes exigem PostgreSQL.");
  }
  if (localHosts.has(url.hostname)) return databaseUrl;

  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (
    allowRemoteDatabase !== "leiloes" ||
    databaseName !== "leiloes" ||
    !url.hostname.endsWith(".postgres.database.azure.com") ||
    url.port !== "5432" ||
    url.searchParams.get("sslmode") !== "require"
  ) {
    throw new Error(
      "Banco remoto bloqueado. Azure exige E2E_ALLOW_REMOTE_DATABASE=leiloes, banco leiloes, host Azure e SSL obrigatório.",
    );
  }

  return databaseUrl;
}

export function resolveTestDatabaseUrl(options: {
  explicitTestUrl?: string;
  databaseUrl?: string;
  localFallback?: string;
  allowRemoteDatabase?: string;
}): string {
  const databaseUrl =
    options.explicitTestUrl ??
    (options.allowRemoteDatabase === "leiloes"
      ? options.databaseUrl
      : undefined) ??
    options.localFallback;

  if (!databaseUrl) {
    throw new Error(
      "Configure TEST_DATABASE_URL ou o fallback local de testes.",
    );
  }

  return validateTestDatabaseUrl(databaseUrl, options.allowRemoteDatabase);
}
