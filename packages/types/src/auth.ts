import { z } from "zod";

export const userDtoSchema = z.object({
  id: z.uuid(),
  name: z.string().nullable(),
  email: z.email(),
  image: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type UserDto = z.infer<typeof userDtoSchema>;

export const passwordSchema = z.string().min(8, "Haslo musi miec co najmniej 8 znakow").max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Imie jest wymagane").max(64),
  email: z.email("Nieprawidlowy adres e-mail").trim().toLowerCase(),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

// Przy logowaniu nie powtarzamy reguly dlugosci hasla - dla kont zalozonych
// przed jej zmiana dawaloby to 400 zamiast 401.
export const loginSchema = z.object({
  email: z.email("Nieprawidlowy adres e-mail").trim().toLowerCase(),
  password: z.string().min(1, "Haslo jest wymagane"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const authResponseSchema = z.object({
  user: userDtoSchema,
  token: z.string(),
  expiresAt: z.number(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
