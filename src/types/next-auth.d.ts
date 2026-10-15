import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "ADMIN";
    authVersion?: number;
  }
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: "ADMIN";
      authVersion: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN";
    authVersion?: number;
  }
}
