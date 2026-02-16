import { UserRole } from "@/types/database";

export const ROLE_LABELS: Record<string, string> = {
    [UserRole.SUPER_ADMIN]: "Süper Yönetici",
    [UserRole.ADMIN]: "Yönetici",
    [UserRole.DOKTOR]: "Doktor",
    [UserRole.SEKRETER]: "Sekreter",
    [UserRole.FINANS]: "Finans",
};

export const ROLE_DESCRIPTIONS = [
    { role: UserRole.DOKTOR, desc: "Tıbbi işlemler: randevular, hasta notları ve tedavi planları" },
    { role: UserRole.SEKRETER, desc: "Operasyon: randevu kayıt, hasta teyit ve resepsiyon işlemleri" },
    { role: UserRole.FINANS, desc: "Maddi işlemler: ödemeler, taksitler ve finansal raporlar" },
];

export const ROLE_BADGE_COLORS: Record<string, string> = {
    [UserRole.SUPER_ADMIN]: "bg-purple-100 text-purple-700 border-purple-200",
    [UserRole.ADMIN]: "bg-teal-100 text-teal-700 border-teal-200",
    [UserRole.DOKTOR]: "bg-blue-100 text-blue-700 border-blue-200",
    [UserRole.SEKRETER]: "bg-amber-100 text-amber-700 border-amber-100",
    [UserRole.FINANS]: "bg-emerald-100 text-emerald-700 border-emerald-200",
};
