"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/lib/auth";
import { getAuthOrigin, isSameOrigin } from "@/lib/auth-policy";
import { credentialsSchema } from "@/lib/credentials-schema";
import { requireAdmin } from "@/lib/admin-auth";

export async function loginAction(
  input: unknown,
): Promise<{ error: string } | undefined> {
  const requestHeaders = await headers();
  if (!isSameOrigin(requestHeaders.get("origin"), getAuthOrigin()))
    return { error: "Solicitação não permitida." };
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Confira o e-mail e a senha informados." };
  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin")
        return {
          error:
            "Não foi possível entrar. Confira suas credenciais ou aguarde antes de tentar novamente.",
        };
      return {
        error: "Não foi possível entrar agora. Tente novamente em instantes.",
      };
    }
    throw error;
  }
}

export async function logoutAction() {
  if (!isSameOrigin((await headers()).get("origin"), getAuthOrigin()))
    throw new Error("Solicitação não permitida.");
  await requireAdmin();
  await signOut({ redirectTo: "/admin/login" });
}
