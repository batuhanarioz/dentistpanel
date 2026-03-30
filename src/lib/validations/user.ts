import { z } from "zod";
import { UserRole } from "@/types/database";

export const createUserSchema = z.object({
    email: z.string().email("Geçersiz e-posta adresi"),
    password: z.string().min(6, "Şifre en az 6 karakter olmalıdır").optional(),
    fullName: z.string().optional().nullable(),
    role: z.nativeEnum(UserRole).default(UserRole.SEKRETER),
    clinicId: z.string().optional().nullable(),
    invite: z.boolean().optional().default(false),
    isClinicalProvider: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
    id: z.string().min(1, "ID zorunludur"),
    fullName: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
    isClinicalProvider: z.boolean().optional(),
    specialtyCode: z.string().optional().nullable(),
    workingHours: z.record(z.string(), z.any()).optional().nullable(),
});

export const deleteUserSchema = z.object({
    id: z.string().min(1, "ID zorunludur"),
});

export const resetPasswordSchema = z.object({
    id: z.string().min(1, "ID zorunludur"),
    password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});
