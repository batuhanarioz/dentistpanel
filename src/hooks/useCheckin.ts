import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

export interface CheckinCode {
    id: string;
    clinic_id: string;
    appointment_id: string;
    code: string;
    expires_at: string;
}

export interface CheckinAppointment {
    id: string;
    patientId: string;
    patientName: string;
    doctorName: string | null;
    appointmentTime: string;
    treatmentType: string | null;
}

export function useCheckin(clinicId?: string | null) {
    const [isLoadingGenerate, setIsLoadingGenerate] = useState(false);
    const [isLoadingVerify, setIsLoadingVerify] = useState(false);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);

    /**
     * Personel tarafından çağrılır: randevu için 4 haneli check-in kodu üretir.
     * Kriptografik olarak güvenli rastgele sayı üretir.
     */
    const generateCode = useCallback(async (appointmentId: string) => {
        if (!clinicId) {
            toast.error("Klinik bilgisi bulunamadı. Sayfayı yenileyiniz.");
            return;
        }
        setIsLoadingGenerate(true);
        try {
            // crypto.getRandomValues — kriptografik olarak güvenli
            const array = new Uint16Array(1);
            crypto.getRandomValues(array);
            const code = (1000 + (array[0] % 9000)).toString();

            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 saat

            const { data, error } = await supabase
                .from("checkin_codes")
                .upsert(
                    [{ clinic_id: clinicId, appointment_id: appointmentId, code, expires_at: expiresAt, used_at: null }],
                    { onConflict: "appointment_id" }
                )
                .select()
                .single();

            if (error) throw error;

            toast.success(
                `Giriş Kodu: ${code}  ·  1 saat geçerli`,
                { duration: 8000, icon: "🔑" }
            );
            return data as CheckinCode;
        } catch (err: unknown) {
            const error = err as { message?: string };
            const msg = error?.message ?? "Bilinmeyen hata";
            toast.error(`Kod üretilemedi: ${msg}`);
        } finally {
            setIsLoadingGenerate(false);
        }
    }, [clinicId]);

    /**
     * Public check-in sayfasından çağrılır.
     * Doğrudan Supabase değil, /api/checkin/verify API route'u kullanır.
     * Rate limiting sunucu taraflıdır.
     */
    const verifyCode = useCallback(async (
        code: string,
        slug: string
    ): Promise<CheckinAppointment | null> => {
        setIsLoadingVerify(true);
        try {
            const res = await fetch("/api/checkin/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: code.trim(), slug }),
            });

            const json = await res.json();

            if (!res.ok) {
                if (res.status === 429) {
                    toast.error(json.error ?? "Çok fazla deneme. Personelden yardım isteyin.");
                } else {
                    toast.error(json.error ?? "Geçersiz veya süresi dolmuş kod.");
                }
                return null;
            }

            return json as CheckinAppointment;
        } catch {
            toast.error("Bağlantı hatası. Lütfen tekrar deneyiniz.");
            return null;
        } finally {
            setIsLoadingVerify(false);
        }
    }, []);

    /**
     * Public check-in sayfasından çağrılır.
     * Doğrudan Supabase değil, /api/checkin/search API route'u kullanır.
     */
    const findAppointmentsByPhone = useCallback(async (
        phone: string,
        slug: string
    ): Promise<CheckinAppointment[]> => {
        setIsLoadingSearch(true);
        try {
            const res = await fetch("/api/checkin/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, slug }),
            });

            const json = await res.json();

            if (!res.ok) {
                if (res.status === 429) {
                    toast.error(json.error ?? "Çok fazla arama yapıldı. Bekleyiniz.");
                } else {
                    toast.error(json.error ?? "Randevu bulunamadı.");
                }
                return [];
            }

            return json.appointments as CheckinAppointment[];
        } catch {
            toast.error("Bağlantı hatası. Lütfen tekrar deneyiniz.");
            return [];
        } finally {
            setIsLoadingSearch(false);
        }
    }, []);

    return {
        isLoading: isLoadingGenerate || isLoadingVerify || isLoadingSearch,
        isLoadingGenerate,
        isLoadingVerify,
        isLoadingSearch,
        generateCode,
        verifyCode,
        findAppointmentsByPhone,
    };
}
