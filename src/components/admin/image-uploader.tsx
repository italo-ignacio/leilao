"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  LoaderCircle,
  Link2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mutateImageAction } from "@/app/admin/record-actions";
import { ConfirmButton } from "./confirm-button";
import { inputClass } from "./form-fields";

export type GalleryImage = {
  id: string;
  storageKey: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export function ImageUploader({
  lotId,
  images,
}: {
  lotId: string;
  images: GalleryImage[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function mutate(input: unknown): Promise<string | null> {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await mutateImageAction(input);
      if (!result.ok) return result.error;
      router.refresh();
      return null;
    } catch {
      return "Não foi possível alterar a galeria.";
    } finally {
      setBusy(false);
    }
  }

  async function upload(body: FormData, successMessage: string) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/lots/${lotId}/images`, {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Não foi possível enviar as imagens.",
        );
        return false;
      }
      setSuccess(successMessage);
      router.refresh();
      return true;
    } catch {
      setError("Não foi possível enviar a imagem.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="images-title" className="mt-12 border-t pt-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="images-title" className="text-lg font-semibold">
          Imagens do lote
        </h2>
        <span className="text-sm text-muted-foreground">
          {images.length}/20
        </span>
      </div>
      <form
        className="mb-8 flex flex-wrap items-end gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const body = new FormData();
          for (const file of files) body.append("images", file);
          if (await upload(body, "Imagens salvas.")) {
            setFiles([]);
            if (fileInput.current) fileInput.current.value = "";
          }
        }}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor="images" className="block text-sm font-medium">
            JPEG, PNG ou WebP · até 5 MB por arquivo
          </label>
          <input
            ref={fileInput}
            id="images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className={`${inputClass} max-w-full`}
            disabled={busy || images.length >= 20}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </div>
        <Button
          type="submit"
          className="h-11"
          disabled={busy || files.length === 0 || images.length >= 20}
        >
          {busy ? (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Upload aria-hidden="true" />
          )}
          {busy ? "Aguarde..." : "Enviar imagens"}
        </Button>
      </form>
      <form
        className="mb-8 flex flex-wrap items-end gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const body = new FormData();
          body.set("imageUrl", imageUrl);
          if (await upload(body, "Imagem salva na galeria.")) setImageUrl("");
        }}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor="image-url" className="block text-sm font-medium">
            Adicionar imagem por link
          </label>
          <input
            id="image-url"
            type="url"
            value={imageUrl}
            maxLength={2048}
            placeholder="https://exemplo.com/imagem.jpg"
            className={inputClass}
            disabled={busy || images.length >= 20}
            required
            onChange={(event) => setImageUrl(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          className="h-11"
          disabled={busy || images.length >= 20 || !imageUrl.trim()}
        >
          {busy ? (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Link2 aria-hidden="true" />
          )}
          Importar imagem
        </Button>
      </form>
      {error && (
        <p
          role="alert"
          aria-label="Erro na galeria"
          className="mb-5 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-5 text-sm text-primary">
          {success}
        </p>
      )}
      {images.length === 0 && (
        <p className="py-6 text-sm text-muted-foreground">
          Nenhuma imagem cadastrada.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <article
            key={image.id}
            className="min-w-0 overflow-hidden rounded-lg border"
          >
            <div className="relative aspect-4/3 bg-muted">
              <Image
                unoptimized
                src={`/api/images/${image.storageKey.split("/").at(-1)}`}
                alt={image.alt}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-contain"
              />
            </div>
            <div className="space-y-3 p-3">
              <form
                className="flex items-end gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const message = await mutate({
                    operation: "alt",
                    lotId,
                    imageId: image.id,
                    alt: data.get("alt"),
                  });
                  if (message) setError(message);
                  else setSuccess("Descrição salva.");
                }}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <label
                    htmlFor={`alt-${image.id}`}
                    className="block text-xs font-medium"
                  >
                    Descrição da imagem {index + 1}
                  </label>
                  <input
                    id={`alt-${image.id}`}
                    name="alt"
                    defaultValue={image.alt}
                    maxLength={300}
                    required
                    className={inputClass}
                    disabled={busy}
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  size="icon"
                  className="size-11"
                  title="Salvar descrição"
                  aria-label={`Salvar descrição da imagem ${index + 1}`}
                  disabled={busy}
                >
                  <Save aria-hidden="true" />
                </Button>
              </form>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {index === 0 ? "Capa" : `Imagem ${index + 1}`}
                </span>
                <div className="flex items-center gap-1">
                  {(
                    [
                      [-1, "cima", ArrowUp],
                      [1, "baixo", ArrowDown],
                    ] as const
                  ).map(([offset, label, Icon]) => (
                    <Button
                      key={label}
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-10"
                      title={`Mover para ${label}`}
                      aria-label={`Mover imagem ${index + 1} para ${label}`}
                      disabled={
                        busy ||
                        index + offset < 0 ||
                        index + offset >= images.length
                      }
                      onClick={async () => {
                        const ids = images.map((entry) => entry.id);
                        [ids[index], ids[index + offset]] = [
                          ids[index + offset],
                          ids[index],
                        ];
                        const message = await mutate({
                          operation: "order",
                          lotId,
                          ids,
                        });
                        if (message) setError(message);
                      }}
                    >
                      <Icon aria-hidden="true" />
                    </Button>
                  ))}
                  <ConfirmButton
                    label={`Remover imagem ${index + 1}`}
                    title="Remover esta imagem?"
                    disabled={busy}
                    onConfirm={() =>
                      mutate({ operation: "delete", lotId, imageId: image.id })
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </ConfirmButton>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
