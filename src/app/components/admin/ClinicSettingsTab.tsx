"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import { UserRole, DayOfWeek, DaySchedule, ClinicSettings, WorkingHours } from "@/types/database";
import { DAY_LABELS, ORDERED_DAYS } from "@/constants/days";
import { TURKEY_CITIES, getDistricts } from "@/constants/turkeyGeo";
import { updateClinicSettings, getTreatmentDefinitions, upsertTreatmentDefinition, deleteTreatmentDefinition } from "@/lib/api";
import { PremiumDatePicker } from "../PremiumDatePicker";
import { localDateStr } from "@/lib/dateUtils";
import { TreatmentDefinition } from "@/types/database";
import { QRCodeGenerator } from "../ui/QRCodeGenerator";
import { getCheckinUrl } from "@/lib/config";

const PLACEHOLDERS = [
    { key: "{patient_name}", label: "HASTA ADI", color: "from-indigo-500 to-indigo-600" },
    { key: "{patient_surname}", label: "HASTA SOYADI", color: "from-indigo-400 to-indigo-500" },
    { key: "{appointment_time}", label: "RANDEVU SAATİ", color: "from-violet-500 to-violet-600" },
    { key: "{appointment_date}", label: "RANDEVU TARİHİ", color: "from-sky-500 to-sky-600" },
    { key: "{doctor_name}", label: "HEKİM ADI", color: "from-violet-400 to-violet-500" },
    { key: "{amount}", label: "ÖDEME TUTARI", color: "from-emerald-500 to-emerald-600" },
    { key: "{clinic_name}", label: "KLİNİK ADI", color: "from-rose-500 to-rose-600" }
];

type MessageType = "REMINDER" | "SATISFACTION" | "PAYMENT" | "BIRTHDAY" | "DELAY" | "FOLLOWUP" | "INCOMPLETE" | "NEW_PATIENT" | "LAB_TRACKING";
type SubSection = "profile" | "general" | "checklist" | "assistant" | "treatments" | "channels" | "doctor-hours" | "check-in";

type TaskDefinition = {
    id: string;
    code: string;
    title: string;
    description: string;
};

type TaskRole = {
    definition_id: string;
    role: UserRole;
};

interface WorkingHoursOverride {
    date: string;
    open: string;
    close: string;
    is_closed: boolean;
    note?: string;
}

export function ClinicSettingsTab() {
    const clinic = useClinic();
    const [activeSub, setActiveSub] = useState<SubSection>("assistant");
    const [isLoading, setIsLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Assistant Settings State
    const [localSettings, setLocalSettings] = useState<ClinicSettings | null>(clinic.clinicSettings);
    const [activeMessage, setActiveMessage] = useState<MessageType>("REMINDER");

    // Checklist State
    const [taskDefs, setTaskDefs] = useState<TaskDefinition[]>([]);
    const [clinicRoles, setClinicRoles] = useState<TaskRole[]>([]);
    const [checklistLoading, setChecklistLoading] = useState(false);
    const [dayCloseRoles, setDayCloseRoles] = useState<string[]>(
        clinic.clinicSettings?.feature_permissions?.day_close_roles ?? []
    );

    // General (Working Hours) State
    const [activeGeneralTab, setActiveGeneralTab] = useState<"standard" | "exceptions">("standard");
    const [localHours, setLocalHours] = useState<WorkingHours>(clinic.workingHours);
    const [localOverrides, setLocalOverrides] = useState<WorkingHoursOverride[]>(clinic.workingHoursOverrides || []);
    const [newOverrideDate, setNewOverrideDate] = useState(() => localDateStr());
    const [newOverrideEndDate, setNewOverrideEndDate] = useState(() => localDateStr());
    const [newOverrideOpen, setNewOverrideOpen] = useState("09:00");
    const [newOverrideClose, setNewOverrideClose] = useState("19:00");
    const [isRangeMode, setIsRangeMode] = useState(false);
    const [isFullDayOverride, setIsFullDayOverride] = useState(true);
    const [newOverrideNote, setNewOverrideNote] = useState("");

    // Treatment State
    const [treatmentDefinitions, setTreatmentDefinitions] = useState<TreatmentDefinition[]>([]);
    const [newTreatmentName, setNewTreatmentName] = useState("");
    const [newTreatmentDuration, setNewTreatmentDuration] = useState(30);
    const [newTreatmentMaterialCost, setNewTreatmentMaterialCost] = useState(0);
    const [newTreatmentPrimPercent, setNewTreatmentPrimPercent] = useState(0);
    const [isTreatmentsLoading, setIsTreatmentsLoading] = useState(false);
    const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null);
    const [editingTreatmentName, setEditingTreatmentName] = useState("");
    const [editingTreatmentDuration, setEditingTreatmentDuration] = useState(30);
    const [editingMaterialCost, setEditingMaterialCost] = useState(0);
    const [editingPrimPercent, setEditingPrimPercent] = useState(0);
    const [newTreatmentRecallDays, setNewTreatmentRecallDays] = useState<number | null>(null);
    const [editingRecallDays, setEditingRecallDays] = useState<number | null>(null);

    // Channel State
    const [channels, setChannels] = useState<string[]>(clinic.clinicSettings?.appointment_channels ?? []);
    const [newChannelName, setNewChannelName] = useState("");

    // Doctor Hours State
    type DoctorUser = { id: string; full_name: string; role: string };
    const [doctorList, setDoctorList] = useState<DoctorUser[]>([]);
    const [doctorSchedules, setDoctorSchedules] = useState<Record<string, WorkingHours>>({});
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [doctorHoursLoading, setDoctorHoursLoading] = useState(false);

    // Notification Rules State
    const [notifRules, setNotifRules] = useState({
        notify_doctor_on_new_appointment: clinic.clinicSettings?.notification_rules?.notify_doctor_on_new_appointment ?? true,
        notify_roles_on_new_appointment: clinic.clinicSettings?.notification_rules?.notify_roles_on_new_appointment ?? ["ADMIN", "SEKRETER"] as string[],
    });

    // Profile State
    const [profileName, setProfileName] = useState("");
    const [profilePhone, setProfilePhone] = useState("");
    const [profileEmail, setProfileEmail] = useState("");
    const [profileAddress, setProfileAddress] = useState("");
    const [profileCity, setProfileCity] = useState("");
    const [profileDistrict, setProfileDistrict] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);
    const [originalEmail, setOriginalEmail] = useState("");
    const [emailConfirm, setEmailConfirm] = useState("");

    useEffect(() => {
        if (clinic.clinicSettings) {
            setLocalSettings(clinic.clinicSettings);
            setChannels(clinic.clinicSettings.appointment_channels ?? []);
        }
    }, [clinic.clinicSettings]);

    useEffect(() => {
        setLocalHours(clinic.workingHours);
        setLocalOverrides(clinic.workingHoursOverrides || []);
    }, [clinic.workingHours, clinic.workingHoursOverrides]);

    useEffect(() => {
        if (activeSub === "checklist" && clinic.clinicId) {
            loadChecklistSettings();
        } else if (activeSub === "treatments" && clinic.clinicId) {
            loadTreatmentSettings();
        } else if (activeSub === "profile" && clinic.clinicId) {
            loadProfileSettings();
        } else if (activeSub === "doctor-hours" && clinic.clinicId) {
            loadDoctorHours();
        }
    }, [activeSub, clinic.clinicId]);

    const loadProfileSettings = async () => {
        if (!clinic.clinicId) return;
        setProfileLoading(true);
        try {
            const { data } = await supabase
                .from("clinics")
                .select("name, phone, email, address, city, district")
                .eq("id", clinic.clinicId)
                .single();
            if (data) {
                setProfileName(data.name ?? "");
                setProfilePhone(data.phone ?? "");
                setProfileEmail(data.email ?? "");
                setOriginalEmail(data.email ?? "");
                setEmailConfirm("");
                setProfileAddress(data.address ?? "");
                setProfileCity(data.city ?? "");
                setProfileDistrict(data.district ?? "");
            }
        } finally {
            setProfileLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!clinic.clinicId) return;
        const emailChanged = profileEmail.trim() !== originalEmail;
        if (emailChanged && profileEmail.trim() !== emailConfirm.trim()) {
            setSaveMessage({ type: "error", text: "E-posta doğrulaması eşleşmiyor. Lütfen yeni e-postayı tekrar girin." });
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("clinics")
                .update({ name: profileName.trim(), phone: profilePhone.trim() || null, email: profileEmail.trim() || null, address: profileAddress.trim() || null, city: profileCity.trim() || null, district: profileDistrict.trim() || null })
                .eq("id", clinic.clinicId);
            if (error) throw error;
            setOriginalEmail(profileEmail.trim());
            setEmailConfirm("");
            setSaveMessage({ type: "success", text: "Klinik profili güncellendi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: "error", text: "Profil kaydedilemedi." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveNotifRules = async () => {
        if (!clinic.clinicId) return;
        setIsLoading(true);
        try {
            const { error } = await updateClinicSettings(clinic.clinicId, { ...localSettings!, notification_rules: notifRules });
            if (error) throw error;
            setSaveMessage({ type: "success", text: "Bildirim ayarları kaydedildi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: "error", text: "Kaydedilemedi." });
        } finally {
            setIsLoading(false);
        }
    };

    const loadDoctorHours = async () => {
        if (!clinic.clinicId) return;
        setDoctorHoursLoading(true);
        try {
            const [usersRes, schedulesRes] = await Promise.all([
                supabase.from("users")
                    .select("id, full_name, role, is_clinical_provider")
                    .eq("clinic_id", clinic.clinicId)
                    .or(`role.eq.${UserRole.DOKTOR},is_clinical_provider.eq.true`),
                supabase.from("doctor_schedules")
                    .select("user_id, working_hours")
                    .eq("clinic_id", clinic.clinicId),
            ]);
            setDoctorList(usersRes.data ?? []);
            const schedMap: Record<string, WorkingHours> = {};
            for (const s of (schedulesRes.data ?? [])) {
                schedMap[s.user_id] = s.working_hours;
            }
            setDoctorSchedules(schedMap);
            if (usersRes.data?.length && !selectedDoctorId) {
                setSelectedDoctorId(usersRes.data[0].id);
            }
        } finally {
            setDoctorHoursLoading(false);
        }
    };

    const handleSaveDoctorHours = async (doctorId: string) => {
        if (!clinic.clinicId) return;
        setIsLoading(true);
        try {
            const hours = doctorSchedules[doctorId] ?? {};
            const { error } = await supabase
                .from("doctor_schedules")
                .upsert({ clinic_id: clinic.clinicId, user_id: doctorId, working_hours: hours }, { onConflict: "clinic_id,user_id" });
            if (error) throw error;
            setSaveMessage({ type: "success", text: "Hekim çalışma saatleri kaydedildi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: "error", text: "Kaydedilemedi." });
        } finally {
            setIsLoading(false);
        }
    };

    const updateDoctorHour = (doctorId: string, day: DayOfWeek, field: "open" | "close" | "enabled", value: string | boolean) => {
        setDoctorSchedules(prev => {
            const current: WorkingHours = prev[doctorId] ?? { ...clinic.workingHours };
            return {
                ...prev,
                [doctorId]: {
                    ...current,
                    [day]: { ...current[day], [field]: value },
                },
            };
        });
    };

    const loadChecklistSettings = async () => {
        if (!clinic.clinicId) return;
        setChecklistLoading(true);
        try {
            const [defsRes, rolesRes] = await Promise.all([
                supabase.from("checklist_definitions").select("id, code, title, description"),
                supabase.from("checklist_clinic_roles").select("definition_id, role").eq("clinic_id", clinic.clinicId)
            ]);
            setTaskDefs(defsRes.data || []);
            setClinicRoles(rolesRes.data || []);
        } catch (err: unknown) {
            console.error("Load error:", err);
        } finally {
            setChecklistLoading(false);
        }
    };

    const loadTreatmentSettings = async () => {
        if (!clinic.clinicId) return;
        setIsTreatmentsLoading(true);
        try {
            const data = await getTreatmentDefinitions(clinic.clinicId);
            setTreatmentDefinitions(data);
        } finally {
            setIsTreatmentsLoading(false);
        }
    };

    const handleSaveTreatment = async () => {
        if (!clinic.clinicId || !newTreatmentName) return;
        setIsLoading(true);
        try {
            const { error } = await upsertTreatmentDefinition(clinic.clinicId, {
                name: newTreatmentName,
                default_duration: newTreatmentDuration,
                material_cost: newTreatmentMaterialCost,
                doctor_prim_percent: newTreatmentPrimPercent,
                recall_interval_days: newTreatmentRecallDays,
            });
            if (error) throw error;
            setNewTreatmentName("");
            setNewTreatmentDuration(30);
            setNewTreatmentMaterialCost(0);
            setNewTreatmentPrimPercent(0);
            setNewTreatmentRecallDays(null);
            await loadTreatmentSettings();
            setSaveMessage({ type: 'success', text: "Tedavi başarıyla eklendi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err: unknown) {
            setSaveMessage({ type: 'error', text: "Hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTreatment = async (id: string) => {
        if (!confirm("Bu tedavi türünü silmek istediğinize emin misiniz?")) return;
        setIsLoading(true);
        try {
            const { error } = await deleteTreatmentDefinition(id, clinic.clinicId!);
            if (error) throw error;
            await loadTreatmentSettings();
        } catch (err: unknown) {
            setSaveMessage({ type: 'error', text: "Silme sırasında hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartEditTreatment = (td: TreatmentDefinition) => {
        setEditingTreatmentId(td.id);
        setEditingTreatmentName(td.name);
        setEditingTreatmentDuration(td.default_duration);
        setEditingMaterialCost(td.material_cost ?? 0);
        setEditingPrimPercent(td.doctor_prim_percent ?? 0);
        setEditingRecallDays(td.recall_interval_days ?? null);
    };

    const handleCancelEditTreatment = () => {
        setEditingTreatmentId(null);
        setEditingTreatmentName("");
        setEditingTreatmentDuration(30);
        setEditingMaterialCost(0);
        setEditingPrimPercent(0);
        setEditingRecallDays(null);
    };

    const handleUpdateTreatment = async () => {
        if (!clinic.clinicId || !editingTreatmentId || !editingTreatmentName.trim()) return;
        setIsLoading(true);
        try {
            const { error } = await upsertTreatmentDefinition(clinic.clinicId, {
                id: editingTreatmentId,
                name: editingTreatmentName.trim(),
                default_duration: editingTreatmentDuration,
                material_cost: editingMaterialCost,
                doctor_prim_percent: editingPrimPercent,
                recall_interval_days: editingRecallDays,
            });
            if (error) throw error;
            handleCancelEditTreatment();
            await loadTreatmentSettings();
            setSaveMessage({ type: 'success', text: "Tedavi başarıyla güncellendi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: 'error', text: "Güncelleme sırasında hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAssistant = async () => {
        if (!clinic.clinicId || !localSettings) return;
        setIsLoading(true);
        setSaveMessage(null);
        try {
            // appointment_channels'ı channels state'inden al — localSettings'teki eski değeri ezmesin
            const { error } = await updateClinicSettings(clinic.clinicId, { ...localSettings, appointment_channels: channels });
            if (error) {
                setSaveMessage({ type: 'error', text: "Ayarlar kaydedilirken bir hata oluştu." });
            } else {
                setSaveMessage({ type: 'success', text: "Ayarlar başarıyla kaydedildi." });
                setTimeout(() => setSaveMessage(null), 3000);
            }
        } catch {
            setSaveMessage({ type: 'error', text: "Ayarlar kaydedilirken bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const saveChannelsToDB = async (updated: string[]) => {
        if (!clinic.clinicId) return;
        const { error } = await supabase
            .from("clinic_settings")
            .update({ appointment_channels: updated })
            .eq("clinic_id", clinic.clinicId)
            .select("id")
            .single();
        if (error) {
            setSaveMessage({ type: 'error', text: `Hata: ${error.message}` });
            setTimeout(() => setSaveMessage(null), 4000);
        }
    };

    const handleAddChannel = async () => {
        const name = newChannelName.trim();
        if (!name || !clinic.clinicId) return;
        if (channels.includes(name)) return;
        const updated = [...channels, name];
        setChannels(updated);
        setNewChannelName("");
        setSaveMessage(null);
        setIsLoading(true);
        try {
            await saveChannelsToDB(updated);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteChannel = async (name: string) => {
        if (!clinic.clinicId) return;
        const updated = channels.filter(c => c !== name);
        setChannels(updated);
        setIsLoading(true);
        try {
            // Kanalı settings'ten kaldır
            await saveChannelsToDB(updated);
            // Bu kanala ait randevuları "Belirtilmedi" (null) yap
            await supabase
                .from("appointments")
                .update({ channel: null })
                .eq("clinic_id", clinic.clinicId)
                .eq("channel", name);
        } finally {
            setIsLoading(false);
        }
    };

    const updateMessageTemplate = (type: MessageType, text: string) => {
        if (!localSettings) return;
        setLocalSettings({
            ...localSettings,
            message_templates: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...((localSettings.message_templates || {}) as Record<string, string>) as any,
                [type]: text
            }
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateTiming = (type: MessageType, field: string, value: any) => {
        if (!localSettings) return;
        const currentTimings = (localSettings.assistant_timings as Record<string, { value: number; unit: string }>) || {};
        const currentTypeTiming = currentTimings[type] || { value: 1, unit: 'hours' };

        setLocalSettings({
            ...localSettings,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            assistant_timings: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(currentTimings as any),
                [type]: {
                    ...currentTypeTiming,
                    [field]: value
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any
        });
    };

    const toggleEnabled = (field: string) => {
        if (!localSettings) return;
        setLocalSettings({
            ...localSettings,
            notification_settings: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...((localSettings.notification_settings || {}) as Record<string, boolean>) as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [(field as string)]: !(localSettings.notification_settings as Record<string, boolean>)?.[field]
            }
        });
    };

    const renderPreview = (text: string) => {
        let preview = text;
        preview = preview.replace(/{patient_name}/g, "Zeynep");
        preview = preview.replace(/{patient_surname}/g, "Arslan");
        preview = preview.replace(/{appointment_time}/g, "14:30");
        preview = preview.replace(/{appointment_date}/g, "25.04.2024");
        preview = preview.replace(/{doctor_name}/g, "Dt. Selin Yıldız");
        preview = preview.replace(/{amount}/g, "1.250");
        preview = preview.replace(/{clinic_name}/g, clinic.clinicName || "Klinik");
        return preview;
    };

    const handleToggleRole = (defId: string, role: UserRole) => {
        setClinicRoles(prev => {
            const exists = prev.find(r => r.definition_id === defId && r.role === role);
            if (exists) {
                return prev.filter(r => !(r.definition_id === defId && r.role === role));
            } else {
                return [...prev, { definition_id: defId, role }];
            }
        });
    };

    const isRoleSelected = (defId: string, role: UserRole) => {
        return clinicRoles.some(r => r.definition_id === defId && r.role === role);
    };

    const handleSaveChecklist = async () => {
        if (!clinic.clinicId) return;
        setIsLoading(true);
        setSaveMessage(null);
        try {
            await supabase.from("checklist_clinic_roles").delete().eq("clinic_id", clinic.clinicId);
            if (clinicRoles.length > 0) {
                await supabase.from("checklist_clinic_roles").insert(clinicRoles.map(r => ({ ...r, clinic_id: clinic.clinicId })));
            }
            // Kasa kapatma ve Bildirim kurallarını clinic_settings'e kaydet
            const existingPerms = clinic.clinicSettings?.feature_permissions ?? {};
            await updateClinicSettings(clinic.clinicId, {
                ...clinic.clinicSettings!,
                feature_permissions: { ...existingPerms, day_close_roles: dayCloseRoles },
                notification_rules: notifRules // Bildirim kuralarını da burada kaydediyoruz
            });
            setSaveMessage({ type: 'success', text: "Görev ve izin ayarları başarıyla kaydedildi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err: unknown) {
            setSaveMessage({ type: 'error', text: "Kaydedilirken bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStandard = (day: DayOfWeek, field: keyof DaySchedule, value: string | boolean) => {
        setLocalHours(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    const addOverride = () => {
        if (!newOverrideDate) return;

        const datesToAdd: string[] = [];
        if (isRangeMode && newOverrideEndDate) {
            // eslint-disable-next-line prefer-const
            let current = new Date(newOverrideDate);
            const end = new Date(newOverrideEndDate);
            while (current <= end) {
                datesToAdd.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        } else {
            datesToAdd.push(newOverrideDate);
        }

        const newEntries = datesToAdd.map(date => ({
            date,
            open: isFullDayOverride ? "00:00" : newOverrideOpen,
            close: isFullDayOverride ? "23:59" : newOverrideClose,
            is_closed: isFullDayOverride,
            note: newOverrideNote
        }));

        setLocalOverrides(prev => {
            const filtered = prev.filter(p => !datesToAdd.includes(p.date));
            return [...filtered, ...newEntries].sort((a, b) => a.date.localeCompare(b.date));
        });

        setNewOverrideDate(localDateStr());
        setNewOverrideEndDate(localDateStr());
        setNewOverrideNote("");
    };

    const removeOverride = (date: string) => {
        setLocalOverrides(prev => prev.filter(o => o.date !== date));
    };

    const TURKEY_2026_HOLIDAYS: { date: string; note: string }[] = [
        { date: "2026-01-01", note: "Yılbaşı" },
        { date: "2026-04-23", note: "Ulusal Egemenlik ve Çocuk Bayramı" },
        { date: "2026-05-01", note: "Emek ve Dayanışma Günü" },
        { date: "2026-05-19", note: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
        { date: "2026-07-15", note: "Demokrasi ve Millî Birlik Günü" },
        { date: "2026-08-30", note: "Zafer Bayramı" },
        { date: "2026-10-28", note: "Cumhuriyet Bayramı (yarım gün)" },
        { date: "2026-10-29", note: "Cumhuriyet Bayramı" },
        // 2026 Ramazan Bayramı (tahmini: 21-23 Mart)
        { date: "2026-03-21", note: "Ramazan Bayramı 1. Gün" },
        { date: "2026-03-22", note: "Ramazan Bayramı 2. Gün" },
        { date: "2026-03-23", note: "Ramazan Bayramı 3. Gün" },
        // 2026 Kurban Bayramı (tahmini: 28-31 Mayıs)
        { date: "2026-05-28", note: "Kurban Bayramı Arifesi (yarım gün)" },
        { date: "2026-05-29", note: "Kurban Bayramı 1. Gün" },
        { date: "2026-05-30", note: "Kurban Bayramı 2. Gün" },
        { date: "2026-05-31", note: "Kurban Bayramı 3. Gün" },
        { date: "2026-06-01", note: "Kurban Bayramı 4. Gün" },
    ];

    const handleAddOfficialHolidays = async () => {
        if (!clinic.clinicId) return;
        const newEntries = TURKEY_2026_HOLIDAYS
            .filter(h => !localOverrides.some(o => o.date === h.date))
            .map(h => ({ date: h.date, open: "00:00", close: "23:59", is_closed: true, note: h.note }));
        if (newEntries.length === 0) {
            setSaveMessage({ type: "success", text: "Tüm 2026 resmi tatilleri zaten eklenmiş." });
            setTimeout(() => setSaveMessage(null), 3000);
            return;
        }
        const updatedOverrides = [...localOverrides, ...newEntries].sort((a, b) => a.date.localeCompare(b.date));
        setLocalOverrides(updatedOverrides);
        // Otomatik kaydet — state güncellemesini beklemeden direkt DB'ye yaz
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("clinics")
                .update({ working_hours: localHours, working_hours_overrides: updatedOverrides })
                .eq("id", clinic.clinicId);
            if (error) throw error;
            setSaveMessage({ type: "success", text: `${newEntries.length} resmi tatil eklendi ve kaydedildi.` });
        } catch {
            setSaveMessage({ type: "error", text: "Tatiller eklenemedi." });
        } finally {
            setIsLoading(false);
            setTimeout(() => setSaveMessage(null), 4000);
        }
    };

    const handleSaveGeneral = async () => {
        if (!clinic.clinicId) return;
        setIsLoading(true);
        setSaveMessage(null);
        try {
            const { error } = await supabase
                .from("clinics")
                .update({ working_hours: localHours, working_hours_overrides: localOverrides })
                .eq("id", clinic.clinicId);
            if (error) throw error;
            setSaveMessage({ type: 'success', text: "Çalışma saatleri başarıyla kaydedildi." });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch {
            setSaveMessage({ type: 'error', text: "Kaydedilirken bir hata oluştu." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 pb-24 lg:pb-0 relative">
            {/* Mobile Sticky Header/Select */}
            <div className="lg:hidden sticky top-[72px] z-[80] -mx-4 px-4 py-3 bg-slate-50/90 backdrop-blur-2xl border-b border-slate-200/60 shadow-lg shadow-black/5 animate-in slide-in-from-top-4 duration-500">
                <div className="relative isolate">
                    <select
                        value={activeSub}
                        onChange={(e) => {
                            setActiveSub(e.target.value as SubSection);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full h-15 bg-white border-2 border-indigo-100/80 rounded-[24px] pl-6 pr-12 text-[14px] font-black text-indigo-900 outline-none appearance-none shadow-xl shadow-indigo-500/5 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer relative z-20"
                    >
                        <option value="profile">🏢 Klinik Profili</option>
                        <option value="assistant">🤖 Akıllı Asistan Ayarları</option>
                        <option value="checklist">🛡️ Görev & İzin Yönetimi</option>
                        <option value="general">⏰ Çalışma Saatleri</option>
                        <option value="doctor-hours">👨‍⚕️ Hekim Müsaitliği</option>
                        <option value="treatments">🦷 Tedavi Ayarları</option>
                        <option value="channels">📱 Kanal Yönetimi</option>
                        <option value="check-in">🔲 QR Check-in Yönetimi</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500 z-30">
                        <svg className="w-5 h-5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Sidebar Navigation - Hidden on Mobile, Shown on LG */}
            <aside className="hidden lg:block w-64 shrink-0">
                <div className="bg-white rounded-[32px] border border-slate-200/60 p-2 shadow-xl shadow-slate-200/10 sticky top-24 ring-4 ring-slate-50/50 transition-all duration-500 hover:shadow-2xl">
                    <button
                        onClick={() => setActiveSub("profile")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all ${activeSub === "profile"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'profile' ? 'bg-white/20' : 'bg-rose-50 text-rose-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                            </svg>
                        </div>
                        <span>Klinik Profili</span>
                    </button>


                    <button
                        onClick={() => setActiveSub("assistant")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "assistant"
                            ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'assistant' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-1.074-.765 4.99 4.99 0 0 1 .63-1.536C3.908 17.204 3 15.204 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                            </svg>
                        </div>
                        <span>Akıllı Asistan Ayarları</span>
                    </button>

                    <button
                        onClick={() => setActiveSub("checklist")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "checklist"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'checklist' ? 'bg-white/20' : 'bg-violet-50 text-violet-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                            </svg>
                        </div>
                        <span>Görev & İzin Yönetimi</span>
                    </button>

                    <button
                        onClick={() => setActiveSub("general")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "general"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'general' ? 'bg-white/20' : 'bg-slate-50 text-slate-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <span>Çalışma Saatleri</span>
                    </button>

                    <button
                        onClick={() => setActiveSub("doctor-hours")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "doctor-hours"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'doctor-hours' ? 'bg-white/20' : 'bg-violet-50 text-violet-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                        </div>
                        <span>Hekim Müsaitliği</span>
                    </button>

                    <button
                        onClick={() => setActiveSub("treatments")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "treatments"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'treatments' ? 'bg-white/20' : 'bg-teal-50 text-teal-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.659A2.25 2.25 0 0 0 9.568 3Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                            </svg>
                        </div>
                        <span>Tedavi Ayarları</span>
                    </button>


                    <button
                        onClick={() => setActiveSub("channels")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "channels"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'channels' ? 'bg-white/20' : 'bg-sky-50 text-sky-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                            </svg>
                        </div>
                        <span>Kanal Yönetimi</span>
                    </button>
                    <button
                        onClick={() => setActiveSub("check-in")}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all mt-1 ${activeSub === "check-in"
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeSub === 'check-in' ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.75 11.625c0-.621.504-1.125 1.125-1.125h.75c.621 0 1.125.504 1.125 1.125v.75c0 .621-.504 1.125-1.125 1.125h-.75a1.125 1.125 0 0 1-1.125-1.125v-.75ZM11.625 16.75c0-.621.504-1.125 1.125-1.125h.75c.621 0 1.125.504 1.125 1.125v.75c0 .621-.504 1.125-1.125 1.125h-.75a1.125 1.125 0 0 1-1.125-1.125v-.75ZM16.75 16.75c0-.621.504-1.125 1.125-1.125h.75c.621 0 1.125.504 1.125 1.125v.75c0 .621-.504 1.125-1.125 1.125h-.75a1.125 1.125 0 0 1-1.125-1.125v-.75ZM14.25 14.25h.75v.75h-.75v-.75ZM14.25 19.25h.75v.75h-.75v-.75ZM19.25 14.25h.75v.75h-.75v-.75ZM19.25 19.25h.75v.75h-.75v-.75Z" />
                            </svg>
                        </div>
                        <span>QR Check-in Yönetimi</span>
                    </button>
                </div>
            </aside >

            {/* Main Content Area */}
            <main className="flex-1">
                {activeSub === "profile" && (
                    <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Klinik Profil Bilgileri</h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Kliniğinizin temel bilgilerini yönetin.</p>
                            </div>
                            <div className="hidden lg:block">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isLoading || profileLoading}
                                    className="h-11 px-8 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                    Ayarları Kaydet
                                </button>
                            </div>
                        </div>

                        {/* Mobile Fixed Save Bar for Profile */}
                        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-3xl border-t border-white/20 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 duration-500">
                            <button
                                onClick={handleSaveProfile}
                                disabled={isLoading || profileLoading}
                                className="w-full h-15 rounded-[22px] bg-indigo-600 text-white text-sm font-black shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                DEĞİŞİKLİKLERİ KAYDET
                            </button>
                        </div>

                        {saveMessage && (
                            <div className={`mx-8 mt-6 p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                {saveMessage.text}
                            </div>
                        )}

                        {profileLoading ? (
                            <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /></div>
                        ) : (
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Klinik Adı */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Klinik Adı <span className="text-rose-500">*</span></label>
                                    <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="İzmir Diş Kliniği"
                                        className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all" />
                                </div>

                                {/* Telefon */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefon</label>
                                    <input type="text" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+90 232 000 00 00"
                                        className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all" />
                                </div>

                                {/* E-posta */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-posta</label>
                                    <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="info@klinik.com"
                                        className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all" />
                                </div>

                                {/* E-posta onay — sadece değişince göster */}
                                {profileEmail.trim() !== originalEmail && (
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest ml-1">E-posta Doğrulama <span className="text-rose-500">*</span></label>
                                        <input type="email" value={emailConfirm} onChange={e => setEmailConfirm(e.target.value)} placeholder="Yeni e-postayı tekrar girin"
                                            className={`w-full h-[52px] bg-slate-50 border rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 transition-all ${emailConfirm && emailConfirm !== profileEmail ? 'border-rose-300 focus:ring-rose-500/10' : 'border-slate-200 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white'}`} />
                                    </div>
                                )}

                                {/* Şehir dropdown */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Şehir</label>
                                    <select value={profileCity} onChange={e => { setProfileCity(e.target.value); setProfileDistrict(""); }}
                                        className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all appearance-none">
                                        <option value="">Şehir seçin...</option>
                                        {TURKEY_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                {/* İlçe dropdown */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">İlçe</label>
                                    {getDistricts(profileCity).length > 0 ? (
                                        <select value={profileDistrict} onChange={e => setProfileDistrict(e.target.value)}
                                            className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all appearance-none">
                                            <option value="">İlçe seçin...</option>
                                            {getDistricts(profileCity).map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    ) : (
                                        <input type="text" value={profileDistrict} onChange={e => setProfileDistrict(e.target.value)} placeholder={profileCity ? "İlçe girin..." : "Önce şehir seçin"}
                                            disabled={!profileCity}
                                            className="w-full h-[52px] bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all disabled:opacity-50" />
                                    )}
                                </div>

                                {/* Adres */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Adres</label>
                                    <textarea value={profileAddress} onChange={e => setProfileAddress(e.target.value)} placeholder="Klinik adresi..." rows={3}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all resize-none" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeSub === "assistant" && localSettings && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-[40px] border border-slate-200/60 p-6 sm:p-10 shadow-xl shadow-slate-200/20 relative overflow-hidden group/container">
                            {/* Background decorative glow */}
                            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover/container:bg-indigo-500/10 transition-colors duration-700" />
                            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none group-hover/container:bg-violet-500/10 transition-colors duration-700" />

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200/50">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-1.074-.765 4.99 4.99 0 0 1 .63-1.536C3.908 17.204 3 15.204 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Akıllı Mesaj Asistanı</h2>
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Otomatik İletişim Merkezi</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden lg:block">
                                    <button
                                        onClick={handleSaveAssistant}
                                        disabled={isLoading}
                                        className="h-14 px-10 rounded-[22px] bg-indigo-600 text-white text-sm font-black shadow-xl shadow-indigo-100/80 hover:shadow-indigo-200/90 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-3 group/save"
                                    >
                                        {isLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : 
                                            <svg className="w-5 h-5 group-hover/save:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                            </svg>
                                        }
                                        Ayarları Kaydet
                                    </button>
                                </div>
                            </div>

                            {/* Mobile Fixed Save Bar */}
                            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-3xl border-t border-white/20 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 duration-500">
                                <button
                                    onClick={handleSaveAssistant}
                                    disabled={isLoading}
                                    className="w-full h-15 rounded-[22px] bg-indigo-600 text-white text-sm font-black shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : 
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                    }
                                    AYARLARI KAYDET
                                </button>
                            </div>

                            {saveMessage && (
                                <div className={`mb-8 p-5 rounded-[24px] border text-sm font-bold animate-in zoom-in-95 slide-in-from-top-4 flex items-center gap-4 transition-all duration-300 ${saveMessage.type === 'success'
                                        ? 'bg-emerald-50 border-emerald-100/50 text-emerald-800 shadow-lg shadow-emerald-500/5'
                                        : 'bg-rose-50 border-rose-100/50 text-rose-800 shadow-lg shadow-rose-500/5'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${saveMessage.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d={saveMessage.type === 'success' ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                                        </svg>
                                    </div>
                                    {saveMessage.text}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
                                {/* Left Section: Categories (3/12 or 4/12) */}
                                <div className="md:col-span-4 lg:col-span-3 space-y-3 pr-0 md:pr-4">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 ml-2">İletişim Türleri</h3>
                                    <div className="relative">
                                        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 scrollbar-hide snap-x snap-mandatory">
                                            {(["REMINDER", "SATISFACTION", "PAYMENT", "BIRTHDAY", "DELAY", "FOLLOWUP", "INCOMPLETE", "NEW_PATIENT", "LAB_TRACKING"] as MessageType[]).map((type) => {
                                                const label = type === 'REMINDER' ? 'Hatırlat' :
                                                    type === 'SATISFACTION' ? 'Memnuniyet' :
                                                        type === 'PAYMENT' ? 'Ödeme' :
                                                            type === 'BIRTHDAY' ? 'Doğum' :
                                                                type === 'DELAY' ? 'Gecikme' :
                                                                    type === 'FOLLOWUP' ? 'Cerrahi' :
                                                                        type === 'INCOMPLETE' ? 'Eksik' :
                                                                            type === 'NEW_PATIENT' ? 'Yeni' : 'Lab';

                                                const icons = {
                                                    REMINDER: "⏰", SATISFACTION: "⭐️", PAYMENT: "💳", BIRTHDAY: "🎂",
                                                    DELAY: "⏳", FOLLOWUP: "🩹", INCOMPLETE: "⚠️", NEW_PATIENT: "👋", LAB_TRACKING: "🧪"
                                                };

                                                const isActive = activeMessage === type;

                                                return (
                                                    <button
                                                        key={type}
                                                        onClick={() => setActiveMessage(type)}
                                                        className={`group/cat w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3.5 rounded-[16px] md:rounded-[18px] transition-all duration-300 relative shrink-0 md:shrink snap-center ${isActive
                                                                ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-2 border-indigo-200/60 shadow-md shadow-indigo-100/10'
                                                                : 'hover:bg-slate-50 border border-transparent'
                                                            }`}
                                                    >
                                                        <span className={`text-base md:text-lg transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'grayscale opacity-60 group-hover/cat:grayscale-0 group-hover/cat:opacity-100'}`}>
                                                            {icons[type]}
                                                        </span>
                                                        <span className={`text-[12px] md:text-[13px] font-black whitespace-nowrap tracking-tight transition-colors duration-300 ${isActive ? 'text-indigo-900 border-b-2 border-indigo-400 md:border-none' : 'text-slate-500 group-hover/cat:text-slate-700'}`}>
                                                            {label}
                                                        </span>
                                                        {isActive && <div className="absolute right-4 w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0 hidden md:block" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {/* Mobile scroll indicator mask */}
                                        <div className="md:hidden absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white pointer-events-none z-10" />
                                    </div>
                                </div>

                                {/* Center/Right Section: Editor & Preview */}
                                <div className="md:col-span-8 lg:col-span-9">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                                        <div className="space-y-8">
                                             {/* Assistant Explainer Guide */}
                                            <div className="p-5 rounded-[28px] bg-indigo-50/40 border border-indigo-100/50 mb-4 animate-in slide-in-from-right-4 duration-500 group/guide relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover/guide:scale-110 transition-transform">
                                                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                                                </div>
                                                <div className="flex gap-4 relative z-10">
                                                    <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-indigo-100/50">
                                                        <span className="text-xl">💡</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest mb-1">
                                                            {activeMessage === 'REMINDER' ? 'Randevu Hatırlatıcı' :
                                                             activeMessage === 'SATISFACTION' ? 'Memnuniyet Anketi' :
                                                             activeMessage === 'PAYMENT' ? 'Ödeme Takip' :
                                                             activeMessage === 'BIRTHDAY' ? 'Doğum Günü Kutlama' :
                                                             activeMessage === 'DELAY' ? 'Gecikme Uyarısı' :
                                                             activeMessage === 'FOLLOWUP' ? 'Operasyon Takip' :
                                                             activeMessage === 'INCOMPLETE' ? 'Eksik Veri Takibi' :
                                                             activeMessage === 'NEW_PATIENT' ? 'Hoş Geldin Mesajı' : 'Laboratuvar Takip'}
                                                        </h4>
                                                        <p className="text-[11px] text-indigo-700/70 font-bold leading-relaxed italic">
                                                            {activeMessage === 'REMINDER' ? 'Randevudan önce hastaya onay mesajı iletir ve kliniğe hazırlık için asistan bildirimi gönderir.' :
                                                             activeMessage === 'SATISFACTION' ? 'Tedavi tamamlandığında hastaya otomatik deneyim anketi göndererek geri bildirim toplamanızı sağlar.' :
                                                             activeMessage === 'PAYMENT' ? 'Ödemesi yaklaşan veya geciken hastalar için hem hastaya hem de ilgili personele otomatik hatırlatma yapar.' :
                                                             activeMessage === 'BIRTHDAY' ? 'Hastalarınızın profilinde kayıtlı doğum günlerinde onlara özel kutlama mesajları iletir.' :
                                                             activeMessage === 'DELAY' ? 'Randevu saati geçmesine rağmen işlem başlamamışsa personelinize gecikme uyarısı gönderir.' :
                                                             activeMessage === 'FOLLOWUP' ? 'Cerrahi operasyonlar gibi kritik işlemler sonrası hastanın durumunu sormak için hatırlatma yapar.' :
                                                             activeMessage === 'INCOMPLETE' ? 'Profilinde TC Kimlik veya Telefon bilgisi eksik olan hastalar için kayıt anında uyarı verir.' :
                                                             activeMessage === 'NEW_PATIENT' ? 'Klinik kaydı ilk kez açılan hastalara kliniğiniz hakkında kısa bir tanıtım ve hoş geldin mesajı yollar.' : 'Laboratuvara gönderilen protezlerin durumunu takip eder ve gecikmelerde sizi uyarır.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Timing Card */}
                                            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 space-y-4 shadow-inner">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                        <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                                        Bildirim Zamanlaması
                                                    </h4>
                                                </div>
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="number"
                                                                value={(localSettings.assistant_timings as Record<string, { value: number; unit: string }>)?.[activeMessage]?.value ?? 1}
                                                                onChange={(e) => updateTiming(activeMessage, 'value', parseInt(e.target.value))}
                                                                className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none shadow-sm"
                                                            />
                                                        </div>
                                                        <div className="flex-[1.5]">
                                                            <select
                                                                value={(localSettings.assistant_timings as Record<string, { value: number; unit: string }>)?.[activeMessage]?.unit ?? "hours"}
                                                                onChange={(e) => updateTiming(activeMessage, 'unit', e.target.value)}
                                                                className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all outline-none shadow-sm appearance-none cursor-pointer"
                                                            >
                                                                <option value="minutes">Dakika</option>
                                                                <option value="hours">Saat</option>
                                                                <option value="days">Gün</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-white border border-indigo-100/50 rounded-2xl">
                                                        <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">
                                                            🔍 Randevu saatinden <span className="text-indigo-600">{(localSettings.assistant_timings as Record<string, { value: number; unit: string }>)?.[activeMessage]?.value ?? 1} {(localSettings.assistant_timings as Record<string, { value: number; unit: string }>)?.[activeMessage]?.unit === 'minutes' ? 'dakika' : (localSettings.assistant_timings as Record<string, { value: number; unit: string }>)?.[activeMessage]?.unit === 'hours' ? 'saat' : 'gün'}</span> {activeMessage === 'REMINDER' ? 'önce' : 'sonra'} kliniğe asistan hatırlatma bildirimi gönderilecektir.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Editor Card */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                        <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                                                        Mesaj Taslağı
                                                    </h4>
                                                </div>

                                                <div className="relative group/editor bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm focus-within:ring-8 focus-within:ring-indigo-500/10 focus-within:border-indigo-400 transition-all">
                                                    {/* Clean Editor */}
                                                    <textarea
                                                        id={`template-editor-${activeMessage}`}
                                                        value={(localSettings.message_templates as Record<string, string>)?.[activeMessage] || ""}
                                                        onChange={(e) => updateMessageTemplate(activeMessage, e.target.value)}
                                                        spellCheck="false"
                                                        rows={6}
                                                        className="w-full bg-transparent p-7 text-sm font-semibold leading-relaxed text-slate-900 caret-indigo-600 outline-none transition-all resize-none z-20 relative custom-scrollbar overflow-y-auto"
                                                        style={{ fontFamily: 'inherit' }}
                                                        placeholder="Mesajınızı yazın..."
                                                    />
                                                </div>

                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {PLACEHOLDERS.map(p => (
                                                        <button
                                                            key={p.key}
                                                            onClick={() => {
                                                                const textarea = document.getElementById(`template-editor-${activeMessage}`) as HTMLTextAreaElement;
                                                                if (textarea) {
                                                                    const start = textarea.selectionStart;
                                                                    const end = textarea.selectionEnd;
                                                                    const currentText = (localSettings.message_templates as Record<string, string>)?.[activeMessage] || "";
                                                                    const newText = currentText.substring(0, start) + p.key + currentText.substring(end);
                                                                    updateMessageTemplate(activeMessage, newText);
                                                                    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + p.key.length, start + p.key.length); }, 0);
                                                                }
                                                            }}
                                                            className={`px-3 py-2 rounded-xl bg-gradient-to-r ${p.color} text-white text-[9px] font-black uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-sm border border-white/20`}
                                                        >
                                                            {p.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold italic px-1">
                                                    💡 <span className="text-indigo-500 font-black">{"{...}"}</span> etiketlerini kullanarak mesajı kişiselleştirebilirsiniz. Yukarıdaki butonlara basarak otomatik ekleme yapabilirsiniz.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Preview Column */}
                                        <div className="flex flex-col items-center lg:items-end xl:items-center">
                                            <div className="relative w-72 h-[600px] bg-slate-900 rounded-[48px] p-3 shadow-2xl ring-8 ring-slate-800 scale-90 lg:scale-[0.85] xl:scale-100 origin-top">
                                                {/* Notch */}
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-3xl z-30 flex items-center justify-center">
                                                    <div className="w-10 h-1 bg-slate-800 rounded-full" />
                                                </div>

                                                <div className="w-full h-full bg-[#E5DDD5] rounded-[38px] overflow-hidden flex flex-col relative border-4 border-slate-900/10">
                                                    {/* WhatsApp Mock Status Bar */}
                                                    <div className="h-6 bg-[#075E54] w-full flex justify-between items-center px-6 pt-1 text-[8px] text-white/80 font-bold">
                                                        <span>10:45</span>
                                                        <div className="flex items-center gap-1">
                                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg> 100%
                                                        </div>
                                                    </div>

                                                    <div className="bg-[#075E54] p-4 flex items-center gap-3 shadow-md relative z-10">
                                                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                                            <div className="w-full h-full bg-indigo-500/40 flex items-center justify-center text-[10px] text-white font-black italic">IDK</div>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-white text-xs font-black truncate leading-tight uppercase tracking-tight">{clinic.clinicName || "Dentist Panel"}</p>
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                                                                <p className="text-white/70 text-[9px] font-bold uppercase tracking-tighter">İşletme Hesabı</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                                                        <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-lg shadow-slate-900/5 max-w-[90%] relative animate-in slide-in-from-left-4 duration-500">
                                                            <p className="text-[12px] leading-relaxed text-slate-800 font-bold whitespace-pre-wrap">
                                                                {renderPreview((localSettings.message_templates as Record<string, string>)?.[activeMessage] || "")}
                                                            </p>
                                                            <div className="flex justify-end mt-2 items-center gap-1">
                                                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">10:45</span>
                                                                <svg className="w-3.5 h-3.5 text-[#34B7F1]" fill="currentColor" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none" /><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-4.24l-1.41-1.41L9 13.17 4.17 8.35c-.78-.78-2.04-.78-2.82 0-.78.78-.78 2.04 0 2.82l6.24 6.24c.78.78 2.05.78 2.83 0l12.82-12.82z" /></svg>
                                                            </div>
                                                            <div className="absolute -left-2.5 top-0 w-3 h-3 bg-white" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                                                        </div>
                                                    </div>

                                                    <div className="bg-[#f0f2f5]/95 backdrop-blur p-3 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 shrink-0">
                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                                                        </div>
                                                        <div className="flex-1 h-10 bg-white rounded-full border border-slate-200/50 px-4 flex items-center border">
                                                            <div className="h-1.5 w-24 bg-slate-100 rounded-full" />
                                                        </div>
                                                        <div className="w-10 h-10 bg-[#128C7E] rounded-full flex items-center justify-center text-white shadow-xl shadow-[#128C7E]/20 shrink-0">
                                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="absolute -bottom-10 text-center w-full">
                                                    <span className="bg-slate-800 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg border border-slate-700">CANLI ÖNİZLEME</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {
                    activeSub === "checklist" && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 sm:p-8 shadow-sm">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Görev, Bildirim ve Rol Eşleşmesi</h2>
                                        <p className="text-[11px] text-slate-500 font-bold leading-relaxed max-w-2xl mt-1">
                                            Klinik içerisindeki kritik olayların (eksik veriler, ödeme takipleri, laboratuvar süreçleri) ve
                                            akıllı asistan bildirimlerinin hangi kullanıcı rollerine anlık bildirim olarak düşeceğini buradan yönetebilirsiniz.
                                        </p>
                                    </div>
                                    <div className="hidden lg:block">
                                        <button
                                            onClick={handleSaveChecklist}
                                            disabled={isLoading || checklistLoading}
                                            className="h-11 px-8 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] transition-all disabled:opacity-50"
                                        >
                                            Değişiklikleri Kaydet
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile Fixed Save Bar for Checklist */}
                                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-3xl border-t border-white/20 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 duration-500">
                                    <button
                                        onClick={handleSaveChecklist}
                                        disabled={isLoading || checklistLoading}
                                        className="w-full h-15 rounded-[22px] bg-indigo-600 text-white text-sm font-black shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isLoading || checklistLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                        AYARLARI KAYDET
                                    </button>
                                </div>

                                {saveMessage && (
                                    <div className={`mb-6 p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                        {saveMessage.text}
                                    </div>
                                )}

                                {checklistLoading ? (
                                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /></div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex flex-col gap-8">
                                            {/* Teknik Görevler */}
                                            <div className="w-full">
                                                <div className="flex items-center gap-3 mb-6 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 w-fit">
                                                    <div className="p-2 bg-white rounded-xl shadow-sm">
                                                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Operasyonel Takip Bildirimleri</h3>
                                                        <p className="text-[10px] text-slate-500 font-bold tracking-tight max-w-lg leading-relaxed">
                                                            Sistem tarafından otomatik üretilen aksaklık ve görev uyarılarının
                                                            hangi rollere anlık bildirim olarak düşeceğini buradan belirleyin.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    {taskDefs.filter(d => !d.code.startsWith('ASSISTANT_') && !['BIRTHDAY', 'DELAY', 'FOLLOWUP', 'INCOMPLETE', 'NEW_PATIENT', 'LAB_TRACKING'].includes(d.code)).map((def) => (
                                                        <div key={def.id} className="group/row flex flex-col hover:bg-slate-50 border border-slate-200/60 hover:border-indigo-200 rounded-3xl p-5 transition-all shadow-sm">
                                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                                {/* Sol Kısım: İkon ve Görev Adı */}
                                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                                    <div className="mt-0.5 w-10 h-10 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-100 transition-transform">
                                                                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 px-1">
                                                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                                                            <h3 className="text-[13px] font-black text-slate-900 tracking-tight uppercase whitespace-pre-wrap">{def.title}</h3>
                                                                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center cursor-help group/info relative shrink-0">
                                                                                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 p-4 bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white text-[11px] font-medium rounded-2xl opacity-0 translate-y-2 group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all pointer-events-none z-[100] border border-white/10 ring-1 ring-black/5">
                                                                                    <div className="flex flex-col gap-1.5 whitespace-normal">
                                                                                        <span className="text-indigo-400 font-black text-[10px] uppercase tracking-wider border-b border-white/5 pb-1 mb-0.5 whitespace-nowrap">Bilgilendirme</span>
                                                                                        <p className="leading-relaxed text-slate-200">{def.description}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed w-full break-words">{def.description}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Sağ Kısım: Rol Seçiciler (Pills) */}
                                                                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                                                                    {[UserRole.ADMIN, UserRole.DOKTOR, UserRole.SEKRETER, UserRole.FINANS].map((role) => {
                                                                        const active = isRoleSelected(def.id, role);
                                                                        return (
                                                                            <button
                                                                                key={role}
                                                                                onClick={() => handleToggleRole(def.id, role)}
                                                                                className={`px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${active ? 'bg-indigo-600 text-white shadow-md border border-indigo-700' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-800'}`}
                                                                            >
                                                                                {active && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                                                {role === UserRole.DOKTOR ? "HEKİM" : role}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Akıllı Asistan Bildirim Yetkileri */}
                                            <div className="mt-4">
                                                <div className="flex items-center gap-3 mb-6 bg-violet-50/50 p-4 rounded-3xl border border-violet-100 w-fit">
                                                    <div className="p-2 bg-white rounded-xl shadow-sm">
                                                        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Hasta İletişimi & Asistan Bildirimleri</h3>
                                                        <p className="text-[10px] text-slate-500 font-bold tracking-tight max-w-lg leading-relaxed">
                                                            Hastalara giden otomatik mesajlar (tebrik, takip, hatırlatma vb.)
                                                            hakkında hangi ekip üyelerinin bilgilendirileceğini buradan seçin.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-3">
                                                    {taskDefs.filter(d => d.code.startsWith('ASSISTANT_') || ['BIRTHDAY', 'DELAY', 'FOLLOWUP', 'INCOMPLETE', 'NEW_PATIENT', 'LAB_TRACKING'].includes(d.code)).map((def) => (
                                                        <div key={def.id} className="group/row flex flex-col hover:bg-slate-50 border border-slate-200/60 hover:border-violet-200 rounded-3xl p-5 transition-all shadow-sm">
                                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                                {/* Sol Kısım: İkon ve Görev Adı */}
                                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                                    <div className="mt-0.5 w-10 h-10 rounded-2xl bg-violet-50/80 border border-violet-100 flex items-center justify-center shrink-0 shadow-sm shadow-violet-100 transition-transform">
                                                                        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0 px-1">
                                                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                                                            <h3 className="text-[13px] font-black text-slate-900 tracking-tight uppercase whitespace-pre-wrap">{def.title}</h3>
                                                                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center cursor-help group/info relative shrink-0">
                                                                                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 p-4 bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white text-[11px] font-medium rounded-2xl opacity-0 translate-y-2 group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all pointer-events-none z-[100] border border-white/10 ring-1 ring-black/5">
                                                                                    <div className="flex flex-col gap-1.5 whitespace-normal">
                                                                                        <span className="text-violet-400 font-black text-[10px] uppercase tracking-wider border-b border-white/5 pb-1 mb-0.5 whitespace-nowrap">Bilgilendirme</span>
                                                                                        <p className="leading-relaxed text-slate-200">{def.description}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed w-full break-words">{def.description}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Sağ Kısım: Rol Seçiciler (Pills) */}
                                                                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                                                                    {[UserRole.ADMIN, UserRole.DOKTOR, UserRole.SEKRETER, UserRole.FINANS].map((role) => {
                                                                        const active = isRoleSelected(def.id, role);
                                                                        return (
                                                                            <button
                                                                                key={role}
                                                                                onClick={() => handleToggleRole(def.id, role)}
                                                                                className={`px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${active ? 'bg-violet-600 text-white shadow-md border border-violet-700' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-800'}`}
                                                                            >
                                                                                {active && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                                                {role === UserRole.DOKTOR ? "HEKİM" : role}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="w-full mt-4 group isolate relative">
                                                <div className="group/row flex flex-col hover:bg-slate-50 border border-slate-200/60 hover:border-amber-200 rounded-3xl p-5 transition-all shadow-sm relative group-hover:z-[110] bg-white">
                                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400/20 to-transparent" />
                                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
                                                        {/* Sol Kısım: İkon ve Görev Adı */}
                                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                                            <div className="mt-0.5 w-10 h-10 rounded-2xl bg-amber-50/80 border border-amber-100 flex items-center justify-center shrink-0 shadow-sm shadow-amber-100 transition-transform">
                                                                <svg className="w-5 h-5 text-amber-500 animate-swing origin-top" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0 px-1">
                                                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                                                    <h3 className="text-[13px] font-black text-slate-900 tracking-tight uppercase whitespace-pre-wrap">Klinik İçi Anlık Sistemsel Bildirimler</h3>
                                                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center cursor-help group/info relative shrink-0">
                                                                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 p-4 bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white text-[11px] font-medium rounded-2xl opacity-0 translate-y-2 group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all pointer-events-none z-[120] border border-white/10 ring-1 ring-black/5">
                                                                            <div className="flex flex-col gap-1.5 whitespace-normal">
                                                                                <p className="flex items-center gap-2 text-amber-400 font-black text-[10px] uppercase tracking-wider border-b border-white/5 pb-1 mb-0.5 whitespace-nowrap">
                                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" /></svg>
                                                                                    BİLDİRİM REHBERİ
                                                                                </p>
                                                                                <p className="leading-relaxed text-slate-200 text-left">Randevu defterine yeni bir kayıt girildiğinde veya mevcut bir randevunun detayları (saat, hekim vb.) değiştirildiğinde; seçilen rollere sahip tüm personelin ekranına (sağ üstteki zil ikonuna) anlık uyarı düşer.</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed w-full break-words">Randevu girişlerinde veya güncellemelerinde anlık bildirim alacak rolleri seçin.</p>
                                                            </div>
                                                        </div>

                                                        {/* Sağ Kısım: Rol Seçiciler (Pills) */}
                                                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                                                            {[UserRole.ADMIN, UserRole.DOKTOR, UserRole.SEKRETER, UserRole.FINANS].map((role) => {
                                                                const active = notifRules.notify_roles_on_new_appointment.includes(role);
                                                                return (
                                                                    <button
                                                                        key={role}
                                                                        onClick={() => {
                                                                            const updated = active
                                                                                ? notifRules.notify_roles_on_new_appointment.filter(r => r !== role)
                                                                                : [...notifRules.notify_roles_on_new_appointment, role];
                                                                            setNotifRules(prev => ({ ...prev, notify_roles_on_new_appointment: updated }));
                                                                        }}
                                                                        className={`px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${active ? 'bg-amber-500 text-white shadow-md border border-amber-600' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-800'}`}
                                                                    >
                                                                        {active && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                                        {role === UserRole.DOKTOR ? 'HEKİM' : role}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Modül İzinleri: Kasa Kapatma */}
                                            <div className="w-full mt-4 group isolate relative">
                                                <div className="group/row flex flex-col hover:bg-slate-50 border border-slate-200/60 hover:border-emerald-200 rounded-3xl p-5 transition-all shadow-sm relative group-hover:z-[110] bg-white">
                                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400/20 to-transparent" />
                                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
                                                        {/* Sol Kısım */}
                                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                                            <div className="mt-0.5 w-10 h-10 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-100 transition-transform">
                                                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0 px-1">
                                                                <div className="flex items-center flex-wrap gap-2 mb-1">
                                                                    <h3 className="text-[13px] font-black text-slate-900 tracking-tight uppercase whitespace-pre-wrap">Gün Sonu Kasa Kapatma</h3>
                                                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center cursor-help group/info relative shrink-0">
                                                                        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 p-4 bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white text-[11px] font-medium rounded-2xl opacity-0 translate-y-2 group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all pointer-events-none z-[120] border border-white/10 ring-1 ring-black/5">
                                                                            <div className="flex flex-col gap-1.5 whitespace-normal">
                                                                                <p className="text-emerald-400 font-black text-[10px] uppercase tracking-wider border-b border-white/5 pb-1 mb-0.5 flex items-center gap-2 whitespace-nowrap">
                                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                                                    MALİ GÜVENLİK REHBERİ
                                                                                </p>
                                                                                <p className="leading-relaxed text-slate-200 text-left">Bu yetki, gün sonunda toplanan ödemelerin kontrol edilip kasanın resmi olarak kapatılması işlemini kimlerin yapabileceğini belirler.</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed w-full break-words">Seçilen roller günü kapatabilir. Hiç seçilmezse tüm kullanıcılar kapatır.</p>
                                                            </div>
                                                        </div>

                                                        {/* Sağ Kısım */}
                                                        <div className="flex flex-col items-start lg:items-end gap-3 shrink-0 border-t border-slate-100 lg:border-t-0 pt-4 lg:pt-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {[UserRole.ADMIN, UserRole.DOKTOR, UserRole.SEKRETER, UserRole.FINANS].map((role) => {
                                                                    const selected = dayCloseRoles.includes(role);
                                                                    return (
                                                                        <button
                                                                            key={role}
                                                                            onClick={() => setDayCloseRoles(prev => selected ? prev.filter(r => r !== role) : [...prev, role])}
                                                                            className={`px-3 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${selected ? 'bg-emerald-600 border border-emerald-700 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-800'}`}
                                                                        >
                                                                            {selected && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                                                            {role === UserRole.DOKTOR ? "HEKİM" : role}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            {dayCloseRoles.length === 0 && (
                                                                <p className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-tight flex items-center gap-1.5 border border-emerald-100">
                                                                    <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                                                    Tüm kullanıcılar kapatabilir
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Background decoration */}
                                                <div className="absolute -right-6 top-[-10%] opacity-[0.04] text-emerald-900 group-hover/finance:scale-110 group-hover/finance:-rotate-12 transition-all duration-700 pointer-events-none">
                                                    <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.82v-1.91c-1.47-.29-2.83-1.03-3.92-2.1l1.39-1.39c.83.83 1.83 1.41 2.94 1.63v-3.79c-1.89-.48-3.52-1.78-3.52-4.04 0-2.02 1.35-3.64 3.52-4.14V3h2.82v1.9c1.07.21 2.06.67 2.9 1.33L16.4 7.62a4.4 4.4 0 00-2.43-.91v3.42c1.77.44 3.79 1.6 3.79 4.31 0 2.21-1.52 3.44-3.79 4.14v3.13c1.52-.3 2.82-.95 3.79-1.95zm-2.82-10.75c-.88.24-1.33.8-1.33 1.54 0 .7.45 1.2 1.33 1.45V7.34zm2.82 7.15c.95-.31 1.45-.9 1.45-1.74 0-.8-.5-1.4-1.45-1.7v3.44z" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {
                    activeSub === "general" && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 sm:p-8 shadow-sm">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Klinik Çalışma Saatleri</h2>
                                        <p className="text-sm text-slate-500 font-medium italic">Haftalık düzen ve özel gün istisnalarını yönetin.</p>
                                    </div>
                                    <div className="hidden lg:block">
                                        <button
                                            onClick={handleSaveGeneral}
                                            disabled={isLoading}
                                            className="h-11 px-8 rounded-2xl bg-indigo-600 text-white text-sm font-black shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] transition-all disabled:opacity-50"
                                        >
                                            Ayarları Kaydet
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile Fixed Save Bar for Working Hours */}
                                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-3xl border-t border-white/20 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 duration-500">
                                    <button
                                        onClick={handleSaveGeneral}
                                        disabled={isLoading}
                                        className="w-full h-15 rounded-[22px] bg-indigo-600 text-white text-sm font-black shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {isLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                        ÇALIŞMA SAATLERİNİ KAYDET
                                    </button>
                                </div>

                                <div className="flex gap-4 border-b border-slate-100 mb-8">
                                    <button onClick={() => setActiveGeneralTab("standard")} className={`pb-3 text-xs font-black uppercase tracking-widest relative ${activeGeneralTab === 'standard' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        Haftalık Düzen
                                        {activeGeneralTab === 'standard' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                                    </button>
                                    <button onClick={() => setActiveGeneralTab("exceptions")} className={`pb-3 text-xs font-black uppercase tracking-widest relative ${activeGeneralTab === 'exceptions' ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        Özel Günler
                                        {activeGeneralTab === 'exceptions' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                                    </button>
                                </div>

                                {activeGeneralTab === "standard" ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {ORDERED_DAYS.map((day) => (
                                            <div key={day} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                                                <span className="w-20 text-[10px] font-black text-slate-700 uppercase tracking-tighter shrink-0">{DAY_LABELS[day]}</span>
                                                <div className="flex items-center gap-2">
                                                    <input type="time" value={localHours[day].open} onChange={(e) => handleUpdateStandard(day, "open", e.target.value)} disabled={!localHours[day].enabled} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-40" />
                                                    <span className="text-slate-400">-</span>
                                                    <input type="time" value={localHours[day].close} onChange={(e) => handleUpdateStandard(day, "close", e.target.value)} disabled={!localHours[day].enabled} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-40" />
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer ml-auto">
                                                    <input type="checkbox" className="sr-only peer" checked={localHours[day].enabled} onChange={(e) => handleUpdateStandard(day, "enabled", e.target.checked)} />
                                                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {saveMessage && (
                                            <div className={`p-3 rounded-2xl border text-sm font-bold flex items-center gap-2 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                                {saveMessage.text}
                                            </div>
                                        )}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleAddOfficialHolidays}
                                                className="flex items-center gap-2 h-9 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all active:scale-95"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                                </svg>
                                                2026 Resmi Tatillerini Ekle
                                            </button>
                                        </div>
                                        <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-200/60 shadow-inner space-y-6">
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                                                    <button onClick={() => setIsRangeMode(false)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!isRangeMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Tek Gün</button>
                                                    <button onClick={() => setIsRangeMode(true)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isRangeMode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Aralık</button>
                                                </div>
                                                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                                                    <button onClick={() => setIsFullDayOverride(true)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${isFullDayOverride ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Tüm Gün</button>
                                                    <button onClick={() => setIsFullDayOverride(false)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!isFullDayOverride ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Özel Saatler</button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{isRangeMode ? 'Başlangıç' : 'Tarih'}</label>
                                                    <PremiumDatePicker
                                                        value={newOverrideDate}
                                                        onChange={setNewOverrideDate}
                                                        compact
                                                    />
                                                </div>
                                                {isRangeMode && (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bitiş</label>
                                                        <PremiumDatePicker
                                                            value={newOverrideEndDate}
                                                            onChange={setNewOverrideEndDate}
                                                            compact
                                                        />
                                                    </div>
                                                )}

                                                {!isFullDayOverride && (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Saat Aralığı</label>
                                                        <div className="flex items-center gap-2">
                                                            <input type="time" value={newOverrideOpen} onChange={(e) => setNewOverrideOpen(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                                            <input type="time" value={newOverrideClose} onChange={(e) => setNewOverrideClose(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className={`space-y-1.5 ${(!isRangeMode && isFullDayOverride) ? 'md:col-span-2' : ''} ${(isRangeMode && !isFullDayOverride) ? 'md:col-span-1' : ''}`}>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Açıklama</label>
                                                    <input type="text" placeholder="Örn: Bayram Tatili" value={newOverrideNote} onChange={(e) => setNewOverrideNote(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
                                                </div>
                                                <div className="flex items-end">
                                                    <button onClick={addOverride} className="w-full h-[42px] bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-[0.98]">Ekle</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                                            {localOverrides.map((ov) => (
                                                <div key={ov.date} className="group relative p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 transition-all shadow-sm hover:shadow-md">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-900">{new Date(ov.date).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(ov.date).toLocaleDateString("tr-TR", { weekday: 'long' })}</span>
                                                        </div>
                                                        <button onClick={() => removeOverride(ov.date)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${ov.is_closed ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                                            {ov.is_closed ? 'Kapalı' : `${ov.open} - ${ov.close}`}
                                                        </span>
                                                        {ov.note && <span className="text-[10px] text-slate-500 font-medium truncate italic border-l pl-2 border-slate-100">{ov.note}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                            {localOverrides.length === 0 && (
                                                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                                                    <p className="text-xs font-bold text-slate-400 italic">Henüz özel gün veya istisna eklenmemiş.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    )
                }

                {
                    activeSub === "treatments" && (
                        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Tedavi Türleri ve Süreleri</h3>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Randevu alırken kullanılan işlem türlerini yönetin.</p>
                                </div>
                            </div>

                            <div className="p-8 space-y-8">
                                <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-200/60 shadow-inner">
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-teal-500 rounded-full" />
                                        Yeni Tedavi Ekle
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tedavi Adı</label>
                                            <input
                                                type="text"
                                                placeholder="Örn: Kanal Tedavisi"
                                                value={newTreatmentName}
                                                onChange={(e) => setNewTreatmentName(e.target.value)}
                                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Varsayılan Süre (Dakika)</label>
                                            <input
                                                type="number"
                                                value={newTreatmentDuration}
                                                onChange={(e) => setNewTreatmentDuration(parseInt(e.target.value))}
                                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Malzeme Maliyeti (₺)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={newTreatmentMaterialCost}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => setNewTreatmentMaterialCost(parseFloat(e.target.value) || 0)}
                                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Hekim Prim (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={newTreatmentPrimPercent}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => setNewTreatmentPrimPercent(parseFloat(e.target.value) || 0)}
                                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Geri Çağırma (Gün)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Örn: 180"
                                                value={newTreatmentRecallDays ?? ""}
                                                onChange={(e) => setNewTreatmentRecallDays(e.target.value ? parseInt(e.target.value) : null)}
                                                className="w-full h-[52px] bg-white border border-slate-200 rounded-2xl px-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleSaveTreatment}
                                                disabled={isLoading || !newTreatmentName}
                                                className="w-full h-[52px] bg-gradient-to-r from-teal-600 to-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-100 hover:shadow-teal-200 transition-all active:scale-[0.98] disabled:opacity-50"
                                            >
                                                Ekle
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {isTreatmentsLoading ? (
                                        <div className="col-span-full py-12 flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                                        </div>
                                    ) : treatmentDefinitions.map((td) => (
                                        <div key={td.id} className={`group relative p-6 rounded-[32px] border transition-all shadow-sm ${editingTreatmentId === td.id ? "border-teal-300 bg-teal-50/30 shadow-md" : "border-slate-100 bg-white hover:border-teal-200 hover:shadow-md"}`}>
                                            {editingTreatmentId === td.id ? (
                                                /* ── Düzenleme modu ── */
                                                <div className="space-y-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tedavi Adı</label>
                                                        <input
                                                            type="text"
                                                            value={editingTreatmentName}
                                                            onChange={e => setEditingTreatmentName(e.target.value)}
                                                            onKeyDown={e => { if (e.key === "Enter") handleUpdateTreatment(); if (e.key === "Escape") handleCancelEditTreatment(); }}
                                                            autoFocus
                                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Süre (Dakika)</label>
                                                        <input
                                                            type="number"
                                                            value={editingTreatmentDuration}
                                                            onChange={e => setEditingTreatmentDuration(parseInt(e.target.value) || 0)}
                                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Malzeme Maliyeti (₺)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={editingMaterialCost}
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={e => setEditingMaterialCost(parseFloat(e.target.value) || 0)}
                                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hekim Prim (%)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="0.1"
                                                            value={editingPrimPercent}
                                                            onFocus={(e) => e.target.select()}
                                                            onChange={e => setEditingPrimPercent(parseFloat(e.target.value) || 0)}
                                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Geri Çağırma (Gün)</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            placeholder="Örn: 180"
                                                            value={editingRecallDays ?? ""}
                                                            onChange={e => setEditingRecallDays(e.target.value ? parseInt(e.target.value) : null)}
                                                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 pt-1">
                                                        <button
                                                            onClick={handleUpdateTreatment}
                                                            disabled={isLoading || !editingTreatmentName.trim()}
                                                            className="flex-1 h-9 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                                                        >
                                                            Kaydet
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEditTreatment}
                                                            className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95"
                                                        >
                                                            İptal
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* ── Normal görünüm ── */
                                                <>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-base font-black text-slate-900">{td.name}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">İşlem Türü</span>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => handleStartEditTreatment(td)}
                                                                className="p-2 rounded-xl text-slate-300 hover:text-teal-600 hover:bg-teal-50 transition-all"
                                                                title="Düzenle"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTreatment(td.id)}
                                                                className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                                title="Sil"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                                            </svg>
                                                            <span className="text-[11px] font-black uppercase tracking-tighter">{td.default_duration} Dakika</span>
                                                        </div>
                                                        {(td.material_cost ?? 0) > 0 && (
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                                                                <span className="text-[11px] font-black">₺{td.material_cost} Malzeme</span>
                                                            </div>
                                                        )}
                                                        {(td.doctor_prim_percent ?? 0) > 0 && (
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                <span className="text-[11px] font-black">%{td.doctor_prim_percent} Prim</span>
                                                            </div>
                                                        )}
                                                        {(td.recall_interval_days ?? 0) > 0 && (
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
                                                                <span className="text-[11px] font-black">🔁 {td.recall_interval_days}g Recall</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {!isTreatmentsLoading && treatmentDefinitions.length === 0 && (
                                        <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                                            <p className="text-xs font-bold text-slate-400 italic">Henüz özel bir tedavi türü tanımlanmamış.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeSub === "doctor-hours" && (
                        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-50">
                                <h3 className="text-xl font-black text-slate-900">Hekim Bazlı Müsaitlik</h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Her hekim için ayrı çalışma saati tanımlayın.</p>
                            </div>

                            {saveMessage && (
                                <div className={`mx-8 mt-6 p-4 rounded-2xl border text-sm font-bold flex items-center gap-3 ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>{saveMessage.text}</div>
                            )}

                            {doctorHoursLoading ? (
                                <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /></div>
                            ) : doctorList.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 text-sm font-medium italic">Klinikte kayıtlı hekim bulunamadı.</div>
                            ) : (
                                <div className="p-8 space-y-6">
                                    {/* Doktor seçici */}
                                    <div className="flex flex-wrap gap-2">
                                        {doctorList.map(doc => (
                                            <button key={doc.id}
                                                onClick={() => setSelectedDoctorId(doc.id)}
                                                className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${selectedDoctorId === doc.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                                {doc.full_name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Seçili doktorun çalışma saatleri */}
                                    {selectedDoctorId && (() => {
                                        const hours: WorkingHours = doctorSchedules[selectedDoctorId] ?? clinic.workingHours;
                                        const doc = doctorList.find(d => d.id === selectedDoctorId);
                                        return (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-black text-slate-700">{doc?.full_name} — Haftalık Program</h4>
                                                    <div className="hidden lg:block">
                                                        <button
                                                            onClick={() => handleSaveDoctorHours(selectedDoctorId)}
                                                            disabled={isLoading}
                                                            className="h-9 px-5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                                                            {isLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                                            Kaydet
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Mobile Fixed Save Bar for Doctor Hours */}
                                                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/40 backdrop-blur-3xl border-t border-white/20 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-10 duration-500">
                                                    <button
                                                        onClick={() => handleSaveDoctorHours(selectedDoctorId)}
                                                        disabled={isLoading}
                                                        className="w-full h-15 rounded-[22px] bg-violet-600 text-white text-sm font-black shadow-2xl shadow-violet-500/40 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                                    >
                                                        {isLoading ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                                                        HEKİM TAKVİMİNİ KAYDET
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {ORDERED_DAYS.map(day => (
                                                        <div key={day} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                                                            <span className="w-20 text-[10px] font-black text-slate-700 uppercase tracking-tighter shrink-0">{DAY_LABELS[day]}</span>
                                                            <div className="flex items-center gap-2">
                                                                <input type="time" value={hours[day]?.open ?? "09:00"} onChange={e => updateDoctorHour(selectedDoctorId, day, "open", e.target.value)} disabled={!hours[day]?.enabled} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-40" />
                                                                <span className="text-slate-400">-</span>
                                                                <input type="time" value={hours[day]?.close ?? "18:00"} onChange={e => updateDoctorHour(selectedDoctorId, day, "close", e.target.value)} disabled={!hours[day]?.enabled} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-40" />
                                                            </div>
                                                            <label className="relative inline-flex items-center cursor-pointer ml-auto">
                                                                <input type="checkbox" className="sr-only peer" checked={hours[day]?.enabled ?? true} onChange={e => updateDoctorHour(selectedDoctorId, day, "enabled", e.target.checked)} />
                                                                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-violet-600"></div>
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )
                }

                {
                    activeSub === "channels" && (
                        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-black text-slate-900">Kanal Yönetimi</h3>
                                    {isLoading && <span className="w-3.5 h-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />}
                                </div>
                            </div>
                            <div className="px-8 py-5 bg-sky-50/40 border-b border-sky-100/60">
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                    Randevu kanalları, hastanın kliniğe nasıl ulaştığını takip etmek için kullanılır — örneğin <span className="font-black text-slate-800">Instagram</span>, <span className="font-black text-slate-800">Telefon</span>, <span className="font-black text-slate-800">Google</span> veya <span className="font-black text-slate-800">Tavsiye</span>.
                                    Yeni randevu eklerken veya düzenlerken bu listeden seçim yapılabilir. Silinen bir kanalın atandığı randevular otomatik olarak &ldquo;Belirtilmedi&rdquo; olarak güncellenir.
                                </p>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Yeni kanal ekle */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Kanal adı gir, Ekle'ye bas..."
                                        value={newChannelName}
                                        onChange={(e) => setNewChannelName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChannel(); } }}
                                        disabled={isLoading}
                                        className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all disabled:opacity-50"
                                    />
                                    <button
                                        onClick={handleAddChannel}
                                        disabled={!newChannelName.trim() || isLoading}
                                        className="h-10 px-5 bg-gradient-to-r from-sky-600 to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-sm hover:shadow-md transition-all active:scale-[0.97] disabled:opacity-40"
                                    >
                                        Ekle
                                    </button>
                                </div>

                                {/* Mevcut kanallar */}
                                {channels.length === 0 ? (
                                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                        <p className="text-xs font-semibold text-slate-400">Henüz kanal yok. Randevular &quot;Belirtilmedi&quot; görünür.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {channels.map((ch) => (
                                            <div key={ch} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-all">
                                                <span className="text-sm font-bold text-slate-700">{ch}</span>
                                                <button
                                                    onClick={() => handleDeleteChannel(ch)}
                                                    disabled={isLoading}
                                                    className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-rose-500 transition-all disabled:opacity-40"
                                                    title="Sil"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {saveMessage && (
                                    <div className={`px-3 py-2 rounded-xl text-xs font-bold ${saveMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                        {saveMessage.text}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {activeSub === "check-in" && clinic.clinicId && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-50">
                                <h3 className="text-xl font-black text-slate-900">QR Check-in Sistemi</h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Hastalarınızın bekleme salonunda işlemlerini yapması için QR kodunuzu yönetin.</p>
                            </div>

                            <div className="p-8 sm:p-12 flex flex-col items-center">
                                <QRCodeGenerator
                                    value={getCheckinUrl(clinic.clinicSlug!)}
                                    title={`${clinic.clinicName} Check-in QR Kodu`}
                                    description="Bu kodu bastırıp bekleme salonuna asarak hastalarınızın check-in yapmasını ve dijital anamnez formu doldurmasını sağlayabilirsiniz."
                                />

                                <div className="mt-12 max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-emerald-50 rounded-[28px] border border-emerald-100/50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                            <span className="text-xs font-black text-emerald-900 uppercase">Avantajlar</span>
                                        </div>
                                        <ul className="space-y-2">
                                            <li className="flex items-start gap-2 text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                                                <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                                Sekreteryanın veri girişi yükü azalır.
                                            </li>
                                            <li className="flex items-start gap-2 text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                                                <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                                Hatalı veri girişi riski minimize edilir.
                                            </li>
                                            <li className="flex items-start gap-2 text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                                                <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                                Kliniğinizin teknolojik prestiji artar.
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="p-6 bg-indigo-50 rounded-[28px] border border-indigo-100/50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <span className="text-xs font-black text-indigo-900 uppercase">Nasıl Kullanılır?</span>
                                        </div>
                                        <p className="text-[11px] font-bold text-indigo-700/80 leading-relaxed">
                                            QR kodu indirip bastırarak bekleme salonuna asın. Hasta kodu okutup telefon numarasını girdiğinde randevusuyla eşleşir ve anamnez formu açılır.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main >
        </div >
    );
}
