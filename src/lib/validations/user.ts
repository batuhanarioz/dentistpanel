import { z } from "zod";
import { UserRole } from "@/types/database";

export const createUserSchema = z.object({
    email: z.string().email("Geçersiz e-posta adresi"),
    password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
    fullName: z.string().optional().nullable(),
    role: z.nativeEnum(UserRole).default(UserRole.SEKRETER),
    clinicId: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
    id: z.string().min(1, "ID zorunludur"),
    fullName: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
});

export const deleteUserSchema = z.object({
    id: z.string().min(1, "ID zorunludur"),
});

export const resetPasswordSchema = z.object({
    id: z.string().min(1, "ID zorunludur"),
    password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});
