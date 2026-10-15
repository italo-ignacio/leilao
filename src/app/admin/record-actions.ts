"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { getAuthOrigin, isSameOrigin } from "@/lib/auth-policy";
import { prisma } from "@/lib/prisma";
import {
  AdminMutationError,
  mutateAdminRecord,
  saveAuction,
  saveCategory,
  saveLot,
} from "@/lib/admin-records";
import { ImageUploadError, mutateLotImage } from "@/lib/image-uploads";
import { getImageStorage } from "@/lib/storage";
import type { SaveResult } from "@/lib/admin-schemas";

async function authorizeMutation() {
  if (!isSameOrigin((await headers()).get("origin"), getAuthOrigin()))
    throw new Error("Solicitação não permitida.");
  await requireAdmin();
}

function failure(error: unknown): SaveResult {
  if (error instanceof z.ZodError)
    return {
      ok: false,
      error: "Confira os campos informados.",
      fields: Object.fromEntries(
        error.issues.map((issue) => [issue.path.join("."), issue.message]),
      ),
    };
  if (error instanceof AdminMutationError || error instanceof ImageUploadError)
    return { ok: false, error: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return {
        ok: false,
        error: "Já existe um registro com esse número, nome ou URL.",
      };
    if (error.code === "P2025")
      return {
        ok: false,
        error:
          "O registro foi alterado ou está indisponível. Atualize a página antes de tentar novamente.",
      };
    if (error.code === "P2003")
      return {
        ok: false,
        error:
          "O registro tem vínculos e não pode ser excluído. Desative ou arquive em vez de excluir.",
      };
  }
  return {
    ok: false,
    error:
      "Não foi possível concluir a operação. Tente novamente em instantes.",
  };
}

function invalidate() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

export async function saveAuctionAction(
  id: string | null,
  input: unknown,
): Promise<SaveResult> {
  await authorizeMutation();
  try {
    const record = await saveAuction(prisma, id, input);
    invalidate();
    return { ok: true, id: record.id };
  } catch (error) {
    return failure(error);
  }
}

export async function saveLotAction(
  id: string | null,
  input: unknown,
): Promise<SaveResult> {
  await authorizeMutation();
  try {
    const record = await saveLot(prisma, id, input);
    invalidate();
    return { ok: true, id: record.id };
  } catch (error) {
    return failure(error);
  }
}

export async function saveCategoryAction(
  id: string | null,
  input: unknown,
): Promise<SaveResult> {
  await authorizeMutation();
  try {
    const record = await saveCategory(prisma, id, input);
    invalidate();
    return { ok: true, id: record.id };
  } catch (error) {
    return failure(error);
  }
}

export async function mutateRecordAction(
  kind: "auction" | "lot" | "category",
  input: unknown,
): Promise<SaveResult> {
  await authorizeMutation();
  try {
    z.enum(["auction", "lot", "category"]).parse(kind);
    const record = await mutateAdminRecord(prisma, kind, input);
    invalidate();
    return { ok: true, id: record.id };
  } catch (error) {
    return failure(error);
  }
}

export async function mutateImageAction(input: unknown): Promise<SaveResult> {
  await authorizeMutation();
  try {
    await mutateLotImage(prisma, getImageStorage(), input);
    invalidate();
    return { ok: true, id: "image" };
  } catch (error) {
    return failure(error);
  }
}
