import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const LOGIN_WINDOW_SECONDS = 15 * 60;
export const ACCOUNT_LOGIN_LIMIT = 8;
export const CLIENT_LOGIN_LIMIT = 40;
export const SHARED_LOGIN_LIMIT = 100;

export function getAuthSecret(value = process.env.AUTH_SECRET): string {
  if (!value || value.length < 32)
    throw new Error(
      "Configure AUTH_SECRET com pelo menos 32 caracteres aleatórios.",
    );
  return value;
}

export function getAuthOrigin(
  value = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
): string {
  const origin =
    value ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("Configure AUTH_URL com a URL pública da aplicação.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "AUTH_URL deve ser uma origem HTTP(S), sem caminho ou credenciais.",
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  ) {
    throw new Error("Use HTTPS na autenticação em produção.");
  }
  return url.origin;
}

export function isSameOrigin(origin: string | null, expected: string): boolean {
  return origin !== null && origin === expected;
}

export function getLoginClient(
  headers: Headers,
  trustedHeader = process.env.AUTH_TRUSTED_IP_HEADER,
): string {
  const header =
    trustedHeader ??
    (process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : undefined);
  if (!header) return "shared";
  const value = headers.get(header)?.trim();
  return value && isIP(value) ? value : "shared";
}

export function loginRateLimitKey(
  scope: "account" | "client",
  value: string,
  secret: string,
): string {
  return createHmac("sha256", getAuthSecret(secret))
    .update(`${scope}:${value}`)
    .digest("hex");
}

export function safeAuthRedirect(value: string, origin: string): string {
  try {
    const url = new URL(value, origin);
    if (
      url.origin === origin &&
      (url.pathname === "/" ||
        url.pathname === "/admin" ||
        url.pathname.startsWith("/admin/"))
    ) {
      return url.toString();
    }
  } catch {}
  return `${origin}/admin`;
}
