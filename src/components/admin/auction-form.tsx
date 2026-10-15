"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { auctionFormSchema, type AuctionFormValues } from "@/lib/admin-schemas";
import { parseOfficialAuctionClipboard } from "@/lib/auction-clipboard";
import { saveAuctionAction } from "@/app/admin/record-actions";
import { ClipboardImport } from "./clipboard-import";
import {
  FormError,
  FormField,
  FormSection,
  inputClass,
  SaveButton,
} from "./form-fields";

export function AuctionForm({
  id,
  initial,
}: {
  id: string | null;
  initial: AuctionFormValues;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: fieldError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AuctionFormValues>({
    resolver: zodResolver(auctionFormSchema),
    defaultValues: initial,
  });
  return (
    <form
      className="max-w-4xl space-y-8"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          const result = await saveAuctionAction(id, values);
          if (!result.ok) {
            setError(result.error);
            for (const [name, message] of Object.entries(result.fields ?? {}))
              fieldError(name as FieldPath<AuctionFormValues>, { message });
            return;
          }
          router.push(`/admin/leiloes/${result.id}?salvo=1`);
          router.refresh();
        } catch {
          setError("Não foi possível salvar. Tente novamente.");
        }
      })}
    >
      <input type="hidden" {...register("version")} />
      {id === null && (
        <ClipboardImport
          parser={parseOfficialAuctionClipboard}
          textLabel="Texto copiado do edital"
          disabled={isSubmitting}
          onImport={(values) => {
            for (const [name, value] of Object.entries(values)) {
              if (typeof value === "string") {
                setValue(name as FieldPath<AuctionFormValues>, value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }
          }}
        />
      )}
      <FormSection title="Identificação">
        {(
          [
            ["officialNumber", "Número do edital"],
            ["title", "Título"],
            ["agency", "Órgão"],
            ["unit", "Unidade da RFB"],
            ["officialUrl", "URL oficial do leilão"],
            ["noticeDocumentUrl", "URL do documento do edital"],
          ] as const
        ).map(([name, label]) => (
          <FormField
            key={name}
            id={name}
            label={label}
            error={errors[name]?.message}
          >
            <input
              {...register(name)}
              type={name.endsWith("Url") ? "url" : "text"}
              className={inputClass}
              disabled={isSubmitting}
            />
          </FormField>
        ))}
        <FormField id="mode" label="Modalidade" error={errors.mode?.message}>
          <select
            {...register("mode")}
            className={inputClass}
            disabled={isSubmitting}
          >
            <option value="UNKNOWN">Não informada</option>
            <option value="ELECTRONIC">Eletrônico</option>
            <option value="LIVE">Presencial</option>
          </select>
        </FormField>
        <FormField
          id="sourceStatus"
          label="Situação informada na fonte"
          error={errors.sourceStatus?.message}
        >
          <input
            {...register("sourceStatus")}
            className={inputClass}
            disabled={isSubmitting}
          />
        </FormField>
      </FormSection>
      <FormSection title="Datas · horário de Brasília">
        {(
          [
            ["proposalStartsAt", "Início das propostas"],
            ["proposalEndsAt", "Fim das propostas"],
            ["classificationAt", "Classificação"],
            ["biddingStartsAt", "Início da sessão para lances"],
            ["biddingEndsAt", "Fim da sessão para lances"],
          ] as const
        ).map(([name, label]) => (
          <FormField
            key={name}
            id={name}
            label={label}
            error={errors[name]?.message}
          >
            <input
              type="datetime-local"
              {...register(name)}
              className={inputClass}
              disabled={isSubmitting}
            />
          </FormField>
        ))}
      </FormSection>
      <FormSection title="Publicação e situação">
        <FormField
          id="publicationStatus"
          label="Publicação"
          error={errors.publicationStatus?.message}
        >
          <select
            {...register("publicationStatus")}
            className={inputClass}
            disabled={isSubmitting}
          >
            <option value="DRAFT">Rascunho</option>
            <option value="PUBLISHED">Publicado</option>
          </select>
        </FormField>
        <FormField
          id="statusOverride"
          label="Situação excepcional"
          error={errors.statusOverride?.message}
        >
          <select
            {...register("statusOverride")}
            className={inputClass}
            disabled={isSubmitting}
          >
            <option value="">Automática pelas datas</option>
            <option value="SUSPENDED">Suspenso</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </FormField>
      </FormSection>
      <FormError error={error} />
      <SaveButton busy={isSubmitting} />
    </form>
  );
}
