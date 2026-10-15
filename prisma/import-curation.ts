import "dotenv/config";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { createDatabaseClient } from "../src/lib/database";
import { curationSchema } from "../src/lib/curation";
import { importCuration } from "../src/lib/import-curation";

let client: ReturnType<typeof createDatabaseClient> | undefined;

try {
  const data = curationSchema.parse(
    JSON.parse(
      await readFile(
        new URL("../data/curated-lots.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  if (process.argv.includes("--check")) {
    console.log("Curadoria validada:", {
      auctions: data.auctions.length,
      lots: data.auctions.reduce(
        (total, auction) => total + auction.lots.length,
        0,
      ),
    });
  } else {
    client = createDatabaseClient();
    console.log("Importação concluída:", await importCuration(client, data));
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(
      "Curadoria inválida:",
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  } else {
    console.error(
      "Importação não concluída. Verifique a conexão, as migrations e conflitos com registros existentes. As alterações da transação foram revertidas.",
    );
    console.error(
      "Tipo do erro:",
      error instanceof Error ? error.name : "desconhecido",
    );
  }
  process.exitCode = 1;
} finally {
  await client?.$disconnect();
}
