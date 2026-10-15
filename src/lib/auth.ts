import "server-only";
import NextAuth, { AuthError, CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  getAuthOrigin,
  getAuthSecret,
  isSameOrigin,
  safeAuthRedirect,
} from "./auth-policy";
import {
  authenticateAdmin,
  findActiveAdmin,
  LoginRateLimitError,
} from "./auth-service";
import { prisma } from "./prisma";

class RateLimitedSignIn extends CredentialsSignin {
  code = "rate_limited";
}

const origin = getAuthOrigin();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: getAuthSecret(),
  trustHost: true,
  useSecureCookies: origin.startsWith("https:"),
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login", error: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      authorize: async (credentials, request) => {
        if (!isSameOrigin(request.headers.get("origin"), origin)) return null;
        try {
          return await authenticateAdmin(prisma, credentials, request.headers);
        } catch (error) {
          if (error instanceof LoginRateLimitError)
            throw new RateLimitedSignIn();
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.authVersion = user.authVersion;
      }
      return token;
    },
    async session({ session, token }) {
      const admin = await findActiveAdmin(prisma, token.sub, token.authVersion);
      if (!admin)
        return {
          ...session,
          user: {
            id: "",
            role: undefined,
            authVersion: 0,
            name: null,
            email: null,
            image: null,
          },
        };
      return {
        ...session,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: "ADMIN" as const,
          authVersion: token.authVersion!,
          image: null,
        },
      };
    },
    redirect({ url }) {
      return safeAuthRedirect(url, origin);
    },
  },
  logger: {
    error(error) {
      const type = error instanceof AuthError ? error.type : "AuthError";
      if (type !== "CredentialsSignin")
        console.error("[auth] Falha na autenticação:", type);
    },
  },
});
