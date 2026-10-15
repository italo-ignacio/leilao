import { getCurrentAdmin } from "@/lib/admin-auth";
import { getAuthOrigin, isSameOrigin } from "@/lib/auth-policy";
import { recordIdSchema } from "@/lib/admin-schemas";
import {
  ImageUploadError,
  downloadPublicLotImage,
  MAX_UPLOAD_FILES,
  readUploadForm,
  type UploadFile,
  uploadLotImages,
} from "@/lib/image-uploads";
import { getImageStorage } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request.headers.get("origin"), getAuthOrigin()))
    return Response.json({ error: "Origem não permitida." }, { status: 403 });
  if (!(await getCurrentAdmin()))
    return Response.json({ error: "Acesso não autorizado." }, { status: 401 });
  const id = recordIdSchema.safeParse((await context.params).id);
  if (!id.success)
    return Response.json({ error: "Lote inválido." }, { status: 400 });
  try {
    const form = await readUploadForm(request);
    const entries = form.getAll("images");
    const imageUrl = form.get("imageUrl");
    let files: UploadFile[];
    if (imageUrl !== null) {
      if (typeof imageUrl !== "string" || entries.length !== 0)
        throw new ImageUploadError("Envie um link de imagem válido.");
      files = [await downloadPublicLotImage(imageUrl)];
    } else {
      if (
        entries.length < 1 ||
        entries.length > MAX_UPLOAD_FILES ||
        entries.some((entry) => typeof entry === "string")
      )
        throw new ImageUploadError("Envie de 1 a 5 imagens válidas.");
      files = entries as File[];
    }
    const count = await uploadLotImages(
      prisma,
      getImageStorage(),
      id.data,
      files,
    );
    revalidatePath(`/admin/lotes/${id.data}`);
    revalidatePath("/", "layout");
    return Response.json(
      { count },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ImageUploadError)
      return Response.json({ error: error.message }, { status: 400 });
    return Response.json(
      {
        error:
          "Não foi possível salvar as imagens. Verifique os arquivos e o storage configurado.",
      },
      { status: 500 },
    );
  }
}
