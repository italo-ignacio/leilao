import { z } from "zod";

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Informe um e-mail válido.").max(254)),
  password: z
    .string()
    .min(12, "Informe sua senha completa.")
    .max(128, "Senha muito longa."),
});

export type LoginCredentials = z.infer<typeof credentialsSchema>;
