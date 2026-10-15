import "dotenv/config";
import { createDatabaseClient } from "../src/lib/database";

let client: ReturnType<typeof createDatabaseClient> | undefined;
try {
  client = createDatabaseClient();
  const result = await client.loginRateLimit.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log("Contadores de login expirados removidos:", result.count);
} catch {
  console.error(
    "Não foi possível remover contadores expirados. Verifique a conexão e as migrations.",
  );
  process.exitCode = 1;
} finally {
  await client?.$disconnect();
}
