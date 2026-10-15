import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig, devices } from "@playwright/test";
import { resolveTestDatabaseUrl } from "./src/lib/test-database-target";

const localEnvironment = parseEnv(readFileSync(".env.example", "utf8"));
const databaseUrl = resolveTestDatabaseUrl({
  explicitTestUrl: process.env.TEST_DATABASE_URL,
  databaseUrl: process.env.DATABASE_URL,
  localFallback: localEnvironment.TEST_DATABASE_URL,
  allowRemoteDatabase: process.env.E2E_ALLOW_REMOTE_DATABASE,
});
process.env.TEST_DATABASE_URL = databaseUrl;
process.env.E2E_RUN_ID ??= randomBytes(8).toString("hex");
process.env.E2E_ADMIN_EMAIL ??= `e2e-admin-${process.env.E2E_RUN_ID}@example.test`;
process.env.E2E_VIEWER_EMAIL ??= `e2e-viewer-${process.env.E2E_RUN_ID}@example.test`;
process.env.E2E_INACTIVE_EMAIL ??= `e2e-inactive-${process.env.E2E_RUN_ID}@example.test`;
process.env.E2E_ADMIN_PASSWORD ??= randomBytes(24).toString("base64url");
process.env.E2E_AUTH_SECRET ??= randomBytes(48).toString("base64url");

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/setup.ts",
  globalTeardown: "./tests/e2e/teardown.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command:
      "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_E2E: "1",
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: process.env.E2E_AUTH_SECRET,
      AUTH_URL: "http://127.0.0.1:3100",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
      AUTH_TRUSTED_IP_HEADER: "",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_PATH: "./storage/e2e-uploads",
    },
  },
});
