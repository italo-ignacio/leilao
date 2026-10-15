"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  credentialsSchema,
  type LoginCredentials,
} from "@/lib/credentials-schema";
import { loginAction } from "@/app/admin/actions";

export function LoginForm() {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          const result = await loginAction(values);
          if (result?.error) setError(result.error);
        } catch {
          setError(
            "Não foi possível entrar agora. Tente novamente em instantes.",
          );
        }
      })}
      noValidate
    >
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="username"
          maxLength={254}
          required
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="h-11 w-full rounded-md border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <div className="relative">
          <input
            {...register("password")}
            id="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            maxLength={128}
            required
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="h-11 w-full rounded-md border bg-background pr-12 pl-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0.5 right-0.5 size-10"
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            title={visible ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </Button>
        </div>
        {errors.password && (
          <p
            id="password-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.password.message}
          </p>
        )}
      </div>
      {error && (
        <p
          role="alert"
          aria-label="Falha no login"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full text-sm"
      >
        {isSubmitting ? (
          <LoaderCircle
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          <LogIn aria-hidden="true" />
        )}
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
