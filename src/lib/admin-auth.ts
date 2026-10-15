import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "./auth";

export async function getCurrentAdmin() {
  await connection();
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
