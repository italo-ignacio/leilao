import "dotenv/config";
import { z } from "zod";
import { createDatabaseClient } from "../src/lib/database";
import { seedDatabase, seedEnvironmentSchema } from "../src/lib/seed";

let client: ReturnType<typeof createDatabaseClient> | undefined;

try {
  const environment = seedEnvironmentSchema.parse(process.env);
  client = createDatabaseClient(environment.DATABASE_URL);
  console.log("Seed concluído:", await seedDatabase(client, environment));
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(
      "Configure o ambiente antes do seed:",
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  } else {
    console.error(
      "Seed não concluído. Verifique a conexão, as migrations e o usuário existente. A transação foi revertida.",
    );
  }
  process.exitCode = 1;
} finally {
  await client?.$disconnect();
}
