import { z } from "zod";
import { UserRole } from "@/types/database";

export const createUserSchema = z.object({
    email: z.string().email("Geçersiz e-posta adresi"),
    password: z.string()
        .min(8, "Şifre en az 8 karakter olmalıdır")
        .regex(/[A-Z]/, "En az bir büyük harf içermelidir")
        .regex(/[a-z]/, "En az bir küçük harf içermelidir")
        .regex(/[0-9!@#$%^&*]/, "En az bir rakam veya özel karakter içermelidir")
        .optional(),
    fullName: z.string().optional().nullable(),
    role: z.nativeEnum(UserRole).default(UserRole.SEKRETER),
    clinicId: z.string().optional().nullable(),
    invite: z.boolean().optional().default(false),
    isClinicalProvider: z.boolean().optional().default(false),
    phone: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
    id: z.string().min(1, "ID zorunludur"),
    fullName: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
    isClinicalProvider: z.boolean().optional(),
    specialtyCode: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    workingHours: z.record(z.string(), z.any()).optional().nullable(),
});

export const deleteUserSchema = z.object({
    id: z.string().min(1, "ID zorunludur"),
});

export const resetPasswordSchema = z.object({
    id: z.string().min(1, "ID zorunludur"),
    password: z.string()
        .min(8, "Şifre en az 8 karakter olmalıdır")
        .regex(/[A-Z]/, "En az bir büyük harf içermelidir")
        .regex(/[a-z]/, "En az bir küçük harf içermelidir")
        .regex(/[0-9!@#$%^&*]/, "En az bir rakam veya özel karakter içermelidir"),
});
