import type { PoolConfig } from "pg";

export function getDatabaseConfig(databaseUrl: string | undefined): {
  pool: PoolConfig;
  schema: string;
} {
  if (!databaseUrl) throw new Error("Configure DATABASE_URL no ambiente.");

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL inválida.");
  }
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length < 2
  ) {
    throw new Error("DATABASE_URL deve apontar para um banco PostgreSQL.");
  }

  const local = ["localhost", "127.0.0.1", "[::1]", "db"].includes(
    url.hostname,
  );
  const sslmode = url.searchParams.get("sslmode");
  const schema = url.searchParams.get("schema") ?? "public";
  const limit = url.searchParams.get("connection_limit") ?? "5";
  if (
    !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema) ||
    !/^\d+$/.test(limit) ||
    Number(limit) < 1 ||
    Number(limit) > 20
  ) {
    throw new Error("Schema ou limite de conexões inválido.");
  }
  if (
    sslmode &&
    !["require", "verify-full", "verify-ca", "disable"].includes(sslmode)
  ) {
    throw new Error("Modo SSL não suportado.");
  }
  if (!local && sslmode === "disable")
    throw new Error("SSL é obrigatório para bancos remotos.");

  for (const key of url.searchParams.keys()) {
    if (
      (key.startsWith("ssl") && key !== "sslmode") ||
      key === "uselibpqcompat"
    ) {
      throw new Error(
        "Parâmetro SSL não suportado. A verificação de certificado é obrigatória.",
      );
    }
  }
  url.searchParams.delete("sslmode");
  url.searchParams.delete("schema");
  url.searchParams.delete("connection_limit");

  return {
    schema,
    pool: {
      connectionString: url.toString(),
      ssl:
        !local || (sslmode !== null && sslmode !== "disable")
          ? { rejectUnauthorized: true }
          : undefined,
      max: Number(limit),
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 10_000,
      statement_timeout: 30_000,
    },
  };
}
