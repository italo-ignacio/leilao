"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lotFormSchema, type LotFormValues } from "@/lib/admin-schemas";
import { states } from "@/lib/curation";
import {
  parseOfficialLotClipboard,
  type LotClipboardValues,
} from "@/lib/lot-clipboard";
import { saveLotAction } from "@/app/admin/record-actions";
import { ClipboardImport } from "./clipboard-import";
import {
  FormError,
  FormField,
  FormSection,
  inputClass,
  SaveButton,
} from "./form-fields";

export type RecordOption = { id: string; label: string };

export function LotForm({
  id,
  initial,
  auctions,
  categories,
}: {
  id: string | null;
  initial: LotFormValues;
  auctions: RecordOption[];
  categories: RecordOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError: fieldError,
    formState: { errors, isSubmitting },
  } = useForm<LotFormValues>({
    resolver: zodResolver(lotFormSchema),
    defaultValues: initial,
  });
  const { fields, append, remove, move, replace } = useFieldArray({
    control,
    name: "items",
  });
  return (
    <form
      className="max-w-4xl space-y-8"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          const result = await saveLotAction(id, values);
          if (!result.ok) {
            setError(result.error);
            for (const [name, message] of Object.entries(result.fields ?? {}))
              fieldError(name as FieldPath<LotFormValues>, { message });
            return;
          }
          router.push(`/admin/lotes/${result.id}?salvo=1`);
          router.refresh();
        } catch {
          setError("Não foi possível salvar. Tente novamente.");
        }
      })}
    >
      <input type="hidden" {...register("version")} />
      {id === null && (
        <ClipboardImport
          parser={parseOfficialLotClipboard}
          textLabel="Texto copiado do lote"
          disabled={isSubmitting}
          onImport={(values: LotClipboardValues) => {
            const auction = auctions.find(
              (option) => option.label === values.auctionOfficialNumber,
            );
            if (auction)
              setValue("auctionId", auction.id, {
                shouldDirty: true,
                shouldValidate: true,
              });
            if (values.number !== undefined)
              setValue("number", values.number, {
                shouldDirty: true,
                shouldValidate: true,
              });
            if (values.title !== undefined)
              setValue("title", values.title, {
                shouldDirty: true,
                shouldValidate: true,
              });
            if (values.description !== undefined)
              setValue("description", values.description, {
                shouldDirty: true,
                shouldValidate: true,
              });
            if (values.minimumBid !== undefined)
              setValue("minimumBid", values.minimumBid, {
                shouldDirty: true,
                shouldValidate: true,
              });
            if (values.storageFacility !== undefined)
              setValue("storageFacility", values.storageFacility, {
                shouldDirty: true,
                shouldValidate: true,
              });
            if (values.officialUrl !== undefined)
              setValue("officialUrl", values.officialUrl, {
                shouldDirty: true,
                shouldValidate: true,
              });
            if (values.sourceStatus !== undefined)
              setValue("sourceStatus", values.sourceStatus, {
                shouldDirty: true,
                shouldValidate: true,
              });
            if (values.participationType !== undefined)
              setValue("participationType", values.participationType, {
                shouldDirty: true,
                shouldValidate: true,
              });
            if (values.items !== undefined) {
              replace(values.items);
              setValue("items", values.items, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }
          }}
        />
      )}
      <FormSection title="Identificação">
        <FormField
          id="auctionId"
          label="Leilão / edital"
          error={errors.auctionId?.message}
        >
          <select
            {...register("auctionId")}
            className={inputClass}
            disabled={isSubmitting}
          >
            <option value="">Selecione</option>
            {auctions.map((auction) => (
              <option key={auction.id} value={auction.id}>
                {auction.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="number"
          label="Número do lote"
          error={errors.number?.message}
        >
          <input
            {...register("number")}
            inputMode="numeric"
            className={inputClass}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField id="title" label="Título" error={errors.title?.message}>
          <input
            {...register("title")}
            className={inputClass}
            maxLength={240}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField
          id="categoryId"
          label="Categoria"
          error={errors.categoryId?.message}
        >
          <select
            {...register("categoryId")}
            className={inputClass}
            disabled={isSubmitting}
          >
            <option value="">Selecione</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="description"
          label="Descrição"
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          <textarea
            {...register("description")}
            className={`${inputClass} min-h-32`}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField
          id="minimumBid"
          label="Preço mínimo (R$)"
          error={errors.minimumBid?.message}
        >
          <input
            {...register("minimumBid")}
            inputMode="decimal"
            className={inputClass}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField
          id="appraisalValue"
          label="Valor de avaliação (R$)"
          error={errors.appraisalValue?.message}
        >
          <input
            {...register("appraisalValue")}
            inputMode="decimal"
            className={inputClass}
            disabled={isSubmitting}
          />
        </FormField>
        <FormField
          id="officialUrl"
          label="URL oficial do lote"
          error={errors.officialUrl?.message}
          className="sm:col-span-2"
        >
          <input
            {...register("officialUrl")}
            type="url"
            className={inputClass}
            disabled={isSubmitting}
          />
        </FormField>
      </FormSection>
      <FormSection title="Localização e retirada">
        <FormField id="state" label="UF" error={errors.state?.message}>
          <select
            {...register("state")}
            className={inputClass}
            disabled={isSubmitting}
          >
            {states.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </FormField>
        {(
          [
            ["city", "Cidade"],
            ["storageFacility", "Recinto armazenador"],
            ["pickupAddress", "Endereço de retirada"],
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
              className={inputClass}
              disabled={isSubmitting}
            />
          </FormField>
        ))}
      </FormSection>
      <fieldset className="min-w-0 space-y-5 border-b pb-8">
        <legend className="mb-5 text-base font-semibold">Mercadorias</legend>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid gap-4 border-b pb-5 sm:grid-cols-[7rem_6rem_1fr_auto]"
          >
            <FormField
              id={`item-${index}-quantity`}
              label="Quantidade"
              error={errors.items?.[index]?.quantity?.message}
            >
              <input
                {...register(`items.${index}.quantity`)}
                inputMode="decimal"
                className={inputClass}
                disabled={isSubmitting}
              />
            </FormField>
            <FormField
              id={`item-${index}-unit`}
              label="Unidade"
              error={errors.items?.[index]?.unit?.message}
            >
              <input
                {...register(`items.${index}.unit`)}
                className={inputClass}
                disabled={isSubmitting}
              />
            </FormField>
            <FormField
              id={`item-${index}-description`}
              label={`Mercadoria ${index + 1}`}
              error={errors.items?.[index]?.description?.message}
            >
              <textarea
                {...register(`items.${index}.description`)}
                className={`${inputClass} min-h-20`}
                disabled={isSubmitting}
              />
            </FormField>
            <div className="flex gap-1 sm:pt-7">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Mover mercadoria para cima"
                aria-label={`Mover mercadoria ${index + 1} para cima`}
                disabled={isSubmitting || index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Mover mercadoria para baixo"
                aria-label={`Mover mercadoria ${index + 1} para baixo`}
                disabled={isSubmitting || index === fields.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Remover mercadoria"
                aria-label={`Remover mercadoria ${index + 1}`}
                disabled={isSubmitting || fields.length === 1}
                onClick={() => remove(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
        {errors.items?.root?.message && (
          <p role="alert" className="text-sm text-destructive">
            {errors.items.root.message}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={isSubmitting || fields.length >= 300}
          onClick={() => append({ quantity: "1", unit: "un", description: "" })}
        >
          <Plus aria-hidden="true" />
          Adicionar mercadoria
        </Button>
      </fieldset>
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
            <option value="">Herdar do edital / datas</option>
            <option value="SUSPENDED">Suspenso</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </FormField>
        <FormField
          id="participationType"
          label="Participantes"
          error={errors.participationType?.message}
        >
          <select
            {...register("participationType")}
            className={inputClass}
            disabled={isSubmitting}
          >
            <option value="UNKNOWN">Não confirmado</option>
            <option value="LEGAL_ENTITY">Pessoa jurídica</option>
            <option value="INDIVIDUAL_AND_LEGAL_ENTITY">
              Pessoa física e jurídica
            </option>
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
      <FormField
        id="personalNotes"
        label="Observações pessoais (privadas)"
        error={errors.personalNotes?.message}
      >
        <textarea
          {...register("personalNotes")}
          className={`${inputClass} min-h-24`}
          disabled={isSubmitting}
        />
      </FormField>
      <FormError error={error} />
      <SaveButton busy={isSubmitting} />
    </form>
  );
}
