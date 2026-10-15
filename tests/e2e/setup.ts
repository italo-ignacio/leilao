import { argon2id, hash } from "argon2";
import { createDatabaseClient } from "../../src/lib/database";
import { validateTestDatabaseUrl } from "../../src/lib/test-database-target";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Fixtures E2E exigem TEST_DATABASE_URL.");
  validateTestDatabaseUrl(url, process.env.E2E_ALLOW_REMOTE_DATABASE);
  const password = process.env.E2E_ADMIN_PASSWORD;
  const secret = process.env.E2E_AUTH_SECRET;
  const emails = [
    process.env.E2E_ADMIN_EMAIL,
    process.env.E2E_VIEWER_EMAIL,
    process.env.E2E_INACTIVE_EMAIL,
  ];
  if (
    !password ||
    password.length < 12 ||
    !secret ||
    emails.some(
      (email) =>
        !email ||
        !/^e2e-(admin|viewer|inactive)-[a-f0-9]+@example\.test$/.test(email),
    )
  )
    throw new Error("Configuração das fixtures E2E inválida.");
  const client = createDatabaseClient(url);
  try {
    const passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 1,
    });
    await client.user.createMany({
      data: [
        {
          email: emails[0]!,
          name: "Admin de teste",
          passwordHash,
          role: "ADMIN",
          active: true,
        },
        {
          email: emails[1]!,
          name: "Visitante de teste",
          passwordHash,
          role: "VIEWER",
          active: true,
        },
        {
          email: emails[2]!,
          name: "Admin inativo de teste",
          passwordHash,
          role: "ADMIN",
          active: false,
        },
      ],
    });
  } finally {
    await client.$disconnect();
  }
}
