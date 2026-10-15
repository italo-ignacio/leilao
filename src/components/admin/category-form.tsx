"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/lib/admin-schemas";
import { saveCategoryAction } from "@/app/admin/record-actions";
import { FormError, FormField, inputClass, SaveButton } from "./form-fields";

export function CategoryForm({
  id,
  initial,
}: {
  id: string | null;
  initial: CategoryFormValues;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: fieldError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: initial,
  });
  return (
    <form
      className="max-w-xl space-y-6"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          const result = await saveCategoryAction(id, values);
          if (!result.ok) {
            setError(result.error);
            if (result.fields?.name)
              fieldError("name", { message: result.fields.name });
            return;
          }
          router.push("/admin/categorias?salvo=1");
          router.refresh();
        } catch {
          setError("Não foi possível salvar. Tente novamente.");
        }
      })}
    >
      <input type="hidden" {...register("version")} />
      <FormField id="name" label="Nome" error={errors.name?.message}>
        <input
          {...register("name")}
          className={inputClass}
          maxLength={100}
          disabled={isSubmitting}
        />
      </FormField>
      <label className="flex w-fit items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          {...register("active")}
          className="size-4 accent-primary"
          disabled={isSubmitting}
        />
        Ativa
      </label>
      <FormError error={error} />
      <SaveButton busy={isSubmitting} />
    </form>
  );
}
