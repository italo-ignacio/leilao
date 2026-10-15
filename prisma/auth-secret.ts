import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFile, appendFile } from "node:fs/promises";
import { parseEnv } from "node:util";

try {
  const path = new URL("../.env.local", import.meta.url);
  const content = await readFile(path, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return "";
    },
  );
  const local = parseEnv(content);
  const secret = local.AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) {
    console.log(
      "AUTH_SECRET já configurado; o valor existente foi preservado.",
    );
  } else if (local.AUTH_SECRET !== undefined) {
    throw new Error(
      "Há um AUTH_SECRET inválido em .env.local. Corrija-o diretamente antes de gerar outro.",
    );
  } else {
    await appendFile(
      path,
      `\nAUTH_SECRET=${randomBytes(48).toString("base64url")}\n`,
      { mode: 0o600 },
    );
    console.log(
      "AUTH_SECRET gerado em .env.local, sem exibir seu valor. Reinicie o servidor após alterar segredos.",
    );
  }
} catch (error) {
  console.error(
    error instanceof Error && error.message.startsWith("Há um AUTH_SECRET")
      ? error.message
      : "Não foi possível configurar AUTH_SECRET.",
  );
  process.exitCode = 1;
}
