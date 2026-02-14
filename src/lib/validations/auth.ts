import { z } from "zod";

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, "Eski şifre zorunludur"),
    newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalıdır"),
});
