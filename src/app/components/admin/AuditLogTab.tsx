"use client";

import { useAuditLogs, type PatientMap, type DoctorMap } from "@/hooks/useAuditLogs";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { format, isToday, isYesterday } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogEntry = any;

// ── Alan adları ──────────────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, Record<string, string>> = {
    patients: {
        full_name: "Ad Soyad", phone: "Telefon", email: "E-posta",
        birth_date: "Doğum Tarihi", notes: "Notlar", allergies: "Alerjiler",
        medical_alerts: "Tıbbi Uyarılar", address: "Adres", blood_group: "Kan Grubu",
        gender: "Cinsiyet", occupation: "Meslek", tc_identity_no: "TC No",
        kvkk_consent_at: "KVKK Onayı", nationality_code: "Uyruk",
        identity_type: "Kimlik Tipi", emergency_contact_name: "Acil İletişim",
    },
    appointments: {
        starts_at: "Randevu Tarihi", ends_at: "Bitiş Saati",
        status: "Durum", notes: "Notlar", channel: "Kanal",
        treatment_type: "Tedavi Türü", tags: "Etiketler",
        estimated_amount: "Tahmini Ücret", patient_note: "Hasta Notu",
        internal_note: "İç Not", treatment_note: "Tedavi Notu",
        patient_id: "Hasta", doctor_id: "Doktor",
    },
    payments: {
        amount: "Tutar", status: "Durum", method: "Ödeme Yöntemi",
        note: "Not", due_date: "Vade Tarihi", agreed_total: "Anlaşılan Toplam",
        installment_count: "Taksit Sayısı",
    },
};

// ── Durum çevirileri ─────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
    confirmed: "Planlandı", scheduled: "Taslak", arrived: "Geldi",
    in_treatment: "Tedavide", completed: "Tamamlandı",
    cancelled: "İptal Edildi", no_show: "Gelmedi",
    paid: "Ödendi", pending: "Beklemede", partial: "Kısmi",
    planned: "Planlandı", deferred: "Ertelendi",
};

function translateValue(key: string, val: unknown, patientMap: PatientMap = {}, doctorMap: DoctorMap = {}): string {
    if (val == null) return "—";
    if (key === "status" && typeof val === "string") return STATUS_LABELS[val] || val;
    if (key === "starts_at" || key === "ends_at") {
        try { return format(new Date(val as string), "d MMM yyyy, HH:mm", { locale: tr }); } catch { return String(val); }
    }
    if (key === "due_date" || key === "birth_date") {
        try { return format(new Date(val as string), "d MMM yyyy", { locale: tr }); } catch { return String(val); }
    }
    if (key === "patient_id" && typeof val === "string") return patientMap[val] || val;
    if (key === "doctor_id" && typeof val === "string") return doctorMap[val] || val;
    if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "—";
    return String(val);
}

const IGNORED_FIELDS = [
    "id", "clinic_id", "created_at", "updated_at", "user_id",
    // Teknik/dahili alanlar — kullanıcıya gösterilmez
    "uss_export_state", "source_conversation_id", "source_message_id",
    "encounter_external_ref", "completed_at", "created_by",
    "parent_payment_id", "appointment_id",
];

// ── Değişen alanları bul ─────────────────────────────────────────────────────
function getChangedFields(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null, entityType: string): string[] {
    if (!oldData || !newData) return [];
    const labels = FIELD_LABELS[entityType] || {};
    return Object.keys(newData).filter(
        k => !IGNORED_FIELDS.includes(k) && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])
    ).map(k => labels[k] || k);
}

// ── Entity adını çıkar ───────────────────────────────────────────────────────
function getEntityName(log: LogEntry, patientMap: Record<string, string>): string {
    const d = log.new_data || log.old_data;
    if (!d) return "";
    // Hasta kaydı — doğrudan isim var
    if (d.full_name) return d.full_name;
    // Randevu veya ödeme kaydı — patient_id'den isim bul
    if ((log.entity_type === "appointments" || log.entity_type === "payments") && d.patient_id) {
        return patientMap[d.patient_id] || "";
    }
    return d.patient_name || d.name || "";
}

// ── Randevu özet satırı (tarih + saat) ───────────────────────────────────────
function getAppointmentSummary(log: LogEntry): string {
    const d = log.new_data || log.old_data;
    if (!d?.starts_at) return "";
    try {
        return format(new Date(d.starts_at), "d MMM yyyy, HH:mm", { locale: tr });
    } catch { return ""; }
}

// ── Ödeme özet satırı (tutar) ─────────────────────────────────────────────────
function getPaymentSummary(log: LogEntry): string {
    const d = log.new_data || log.old_data;
    if (!d?.amount) return "";
    return `${Number(d.amount).toLocaleString("tr-TR")} ₺`;
}

// ── İnsan-okunur açıklama ────────────────────────────────────────────────────
function getDescription(log: LogEntry, patientMap: Record<string, string>): { primary: string; secondary: string; fields: string[]; noChange: boolean } {
    const entityName = getEntityName(log, patientMap);
    const changed = getChangedFields(log.old_data, log.new_data, log.entity_type);
    const noChange = log.action === "UPDATE" && changed.length === 0;

    const entityLabel: Record<string, string> = {
        patients: "hasta", appointments: "randevu", payments: "ödeme",
    };
    const entity = entityLabel[log.entity_type] || log.entity_type;
    const apptSummary = log.entity_type === "appointments"
        ? getAppointmentSummary(log)
        : log.entity_type === "payments"
            ? getPaymentSummary(log)
            : "";

    let primary = "";
    if (log.action === "INSERT") {
        primary = entityName ? `${entityName} — yeni ${entity} oluşturuldu` : `Yeni ${entity} kaydı oluşturuldu`;
    } else if (log.action === "UPDATE") {
        if (noChange) {
            primary = entityName ? `${entityName} — ${entity} kaydına erişildi` : `${entity} kaydına erişildi`;
        } else {
            primary = entityName ? `${entityName} — ${entity} güncellendi` : `${entity} kaydı güncellendi`;
        }
    } else if (log.action === "DELETE") {
        primary = entityName ? `${entityName} — ${entity} kaydı silindi` : `${entity} kaydı silindi`;
    }

    return { primary, secondary: apptSummary, fields: changed, noChange };
}

// ── Renk & ikon ─────────────────────────────────────────────────────────────
function getActionStyle(action: string, noChange: boolean) {
    if (noChange) return { border: "border-l-slate-200", dot: "bg-slate-300", badge: "bg-slate-100 text-slate-500 border-slate-200", icon: "bg-slate-100 text-slate-400", row: "", label: "Erişim" };
    switch (action) {
        case "INSERT": return { border: "border-l-emerald-400", dot: "bg-emerald-400", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "bg-emerald-100 text-emerald-600", row: "hover:bg-emerald-50/30", label: "Yeni Kayıt" };
        case "UPDATE": return { border: "border-l-sky-400", dot: "bg-sky-400", badge: "bg-sky-100 text-sky-700 border-sky-200", icon: "bg-sky-100 text-sky-600", row: "hover:bg-sky-50/30", label: "Güncelleme" };
        case "DELETE": return { border: "border-l-rose-400", dot: "bg-rose-400", badge: "bg-rose-100 text-rose-700 border-rose-200", icon: "bg-rose-100 text-rose-600", row: "hover:bg-rose-50/30", label: "Silme" };
        default: return { border: "border-l-slate-200", dot: "bg-slate-300", badge: "bg-slate-100 text-slate-500 border-slate-200", icon: "bg-slate-100 text-slate-400", row: "", label: action };
    }
}

function getEntityIcon(entityType: string) {
    switch (entityType) {
        case "patients":
            return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>;
        case "appointments":
            return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>;
        case "payments":
            return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>;
        default:
            return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>;
    }
}

// ── Tarih grubu ──────────────────────────────────────────────────────────────
function getDayLabel(dateStr: string): string {
    const d = new Date(dateStr);
    if (isToday(d)) return "Bugün";
    if (isYesterday(d)) return "Dün";
    return format(d, "d MMMM yyyy", { locale: tr });
}

function groupByDay(logs: LogEntry[]): { day: string; entries: LogEntry[] }[] {
    const map = new Map<string, LogEntry[]>();
    for (const log of logs) {
        const key = format(new Date(log.created_at), "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(log);
    }
    return Array.from(map.entries()).map(([key, entries]) => ({
        day: getDayLabel(entries[0].created_at),
        entries,
    }));
}

// ── CSV export ───────────────────────────────────────────────────────────────
function exportToCSV(logs: LogEntry[], single?: LogEntry) {
    const data = single ? [single] : logs;
    if (!data.length) return;
    const headers = ["Tarih", "Personel", "İşlem", "Kapsam", "Açıklama", "Değişen Alanlar", "IP"];
    const rows = data.map(log => {
        const { primary, fields } = getDescription(log, {});
        return [
            format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
            log.user?.full_name || "Sistem",
            log.action,
            log.entity_type,
            primary,
            fields.join(", "),
            log.ip_address || "-",
        ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = single ? `islem_${single.id.slice(0, 8)}.csv` : `islem_gunlugu_${format(new Date(), "yyyyMMdd")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── Diff görünümü ────────────────────────────────────────────────────────────
function DiffView({ oldData, newData, entityType, patientMap = {}, doctorMap = {} }: {
    oldData: Record<string, unknown> | null;
    newData: Record<string, unknown> | null;
    entityType: string;
    patientMap?: PatientMap;
    doctorMap?: DoctorMap;
}) {
    if (!oldData && !newData) return (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
            <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-xs font-semibold text-slate-400">Detaylı veri kaydedilmemiş</p>
            <p className="text-[10px] text-slate-300 max-w-[220px]">Bu işlem için eski/yeni veri snapshot&#39;ı mevcut değil.</p>
        </div>
    );
    const labels = FIELD_LABELS[entityType] || {};

    if (!oldData) {
        // INSERT — sadece yeni veri
        const visibleKeys = Object.keys(newData || {}).filter(k => !IGNORED_FIELDS.includes(k) && newData?.[k] != null && newData[k] !== "" && !(Array.isArray(newData[k]) && (newData[k] as unknown[]).length === 0));
        return (
            <div className="space-y-1.5">
                {visibleKeys.map(k => (
                    <div key={k} className="flex gap-2 text-xs">
                        <span className="text-slate-400 w-32 shrink-0">{labels[k] || k}</span>
                        <span className="font-semibold text-emerald-700">{translateValue(k, newData![k], patientMap, doctorMap)}</span>
                    </div>
                ))}
            </div>
        );
    }

    if (!newData) {
        // DELETE
        const visibleKeys = Object.keys(oldData || {}).filter(k => !IGNORED_FIELDS.includes(k) && oldData?.[k] != null);
        return (
            <div className="space-y-1.5">
                {visibleKeys.map(k => (
                    <div key={k} className="flex gap-2 text-xs">
                        <span className="text-slate-400 w-32 shrink-0">{labels[k] || k}</span>
                        <span className="font-semibold text-rose-600 line-through">{translateValue(k, oldData![k], patientMap, doctorMap)}</span>
                    </div>
                ))}
            </div>
        );
    }

    // UPDATE — sadece değişenleri göster
    const changedKeys = Object.keys(newData).filter(
        k => !IGNORED_FIELDS.includes(k) && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])
    );

    if (changedKeys.length === 0) {
        return <p className="text-xs text-slate-400 italic">Kaydedilmiş veri değişikliği bulunamadı.</p>;
    }

    return (
        <div className="space-y-3">
            {changedKeys.map(k => (
                <div key={k} className="text-xs space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{labels[k] || k}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 line-through max-w-[220px] truncate">
                            {translateValue(k, oldData[k], patientMap, doctorMap)}
                        </span>
                        <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold max-w-[220px] truncate">
                            {translateValue(k, newData[k], patientMap, doctorMap)}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Ana bileşen ──────────────────────────────────────────────────────────────
export function AuditLogTab() {
    const { logs, patientMap, doctorMap, loading, error, filters, updateFilters, loadMore, hasMore } = useAuditLogs();
    const { users } = useAdminUsers();
    const [selectedLog, setSelectedLog] = useState<LogEntry>(null);

    const grouped = groupByDay(logs);

    if (error) return <div className="p-8 text-center text-rose-500 font-bold">Hata: {error}</div>;

    return (
        <div className="space-y-5">
            {/* Filtreler */}
            <div className="flex flex-col md:flex-row md:items-end gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">İşlemi Yapan</label>
                        <select value={filters.userId || ""} onChange={e => updateFilters({ userId: e.target.value || null })}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all">
                            <option value="">Tüm Personeller</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Zaman Aralığı</label>
                        <select value={filters.dateRange}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onChange={e => updateFilters({ dateRange: e.target.value as any })}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all">
                            <option value="today">Bugün</option>
                            <option value="7d">Son 7 Gün</option>
                            <option value="30d">Son 30 Gün</option>
                            <option value="all">Tüm Zamanlar</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Kapsam</label>
                        <select value={filters.entityType} onChange={e => updateFilters({ entityType: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all">
                            <option value="all">Tümü</option>
                            <option value="patients">Hastalar</option>
                            <option value="appointments">Randevular</option>
                            <option value="payments">Ödemeler</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">İşlem Tipi</label>
                        <select value={filters.action || "all"}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onChange={e => updateFilters({ action: e.target.value as any })}
                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all">
                            <option value="all">Tümü</option>
                            <option value="INSERT">Yeni Kayıt</option>
                            <option value="UPDATE">Güncelleme</option>
                            <option value="ACCESS">Erişim</option>
                            <option value="DELETE">Silme</option>
                        </select>
                    </div>
                </div>
                <button onClick={() => exportToCSV(logs)} disabled={logs.length === 0}
                    className="h-10 px-5 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center gap-2 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-40 shrink-0">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    CSV İndir
                </button>
            </div>

            {/* Log listesi */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {loading && logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="h-8 w-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-xs font-bold text-slate-400">Yükleniyor...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="p-4 bg-slate-50 rounded-full mb-3">
                            <svg className="h-7 w-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                            </svg>
                        </div>
                        <p className="text-sm font-bold text-slate-400">Seçilen kriterlere uygun kayıt bulunamadı.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {grouped.map(({ day, entries }) => (
                            <div key={day}>
                                {/* Gün başlığı */}
                                <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{day}</span>
                                </div>

                                {entries.map(log => {
                                    const { primary, secondary, fields, noChange } = getDescription(log, patientMap);
                                    const style = getActionStyle(log.action, noChange);

                                    return (
                                        <div key={log.id}
                                            className={`flex items-start gap-4 px-5 py-3.5 border-l-[3px] ${style.border} ${style.row} hover:bg-slate-50/60 transition-colors group cursor-pointer`}
                                            onClick={() => setSelectedLog(log)}
                                        >
                                            {/* Entity icon */}
                                            <div className={`mt-0.5 shrink-0 p-1.5 rounded-lg ${style.icon}`}>
                                                {getEntityIcon(log.entity_type)}
                                            </div>

                                            {/* İçerik */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        {/* Ana açıklama */}
                                                        <p className={`text-sm font-semibold leading-snug ${noChange ? 'text-slate-400' : 'text-slate-800'}`}>
                                                            {primary}
                                                        </p>

                                                        {/* Randevu tarihi özeti */}
                                                        {secondary && (
                                                            <p className="text-[11px] text-slate-500 mt-0.5">{secondary}</p>
                                                        )}

                                                        {/* Değişen alanlar */}
                                                        {fields.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                                {fields.map(f => (
                                                                    <span key={f} className="px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-600 text-[10px] font-bold border border-sky-100">
                                                                        {f}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Kim + saat */}
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className="text-[11px] text-slate-400 font-medium">
                                                                {log.user?.full_name || "Sistem"}
                                                            </span>
                                                            <span className="text-slate-200">·</span>
                                                            <span className="text-[11px] text-slate-400">
                                                                {format(new Date(log.created_at), "HH:mm", { locale: tr })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Sağ taraf: badge + eylemler */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${style.badge}`}>
                                                            {style.label}
                                                        </span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={e => { e.stopPropagation(); exportToCSV(logs, log); }}
                                                                title="CSV"
                                                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-slate-500 transition-all"
                                                            >
                                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {hasMore && (
                            <div className="p-4 text-center">
                                <button onClick={loadMore} disabled={loading}
                                    className="px-5 py-2 rounded-xl text-xs font-black text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                                    {loading ? "Yükleniyor..." : "Daha Fazla Göster"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Detay paneli */}
            {selectedLog && (() => {
                const { primary, secondary, noChange } = getDescription(selectedLog, patientMap);
                const style = getActionStyle(selectedLog.action, noChange);
                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setSelectedLog(null)}>
                        <div className="bg-white rounded-3xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <div className="px-6 py-4 border-b flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${style.badge}`}>{style.label}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">#{selectedLog.id.slice(0, 8)}</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900">{primary}</p>
                                    {secondary && (
                                        <p className="text-[11px] text-slate-500 mt-0.5">{secondary}</p>
                                    )}
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        {selectedLog.user?.full_name || "Sistem"} · {format(new Date(selectedLog.created_at), "d MMMM yyyy, HH:mm", { locale: tr })}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-all ml-4">
                                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <DiffView
                                    oldData={selectedLog.old_data}
                                    newData={selectedLog.new_data}
                                    entityType={selectedLog.entity_type}
                                    patientMap={patientMap}
                                    doctorMap={doctorMap}
                                />
                            </div>

                            {selectedLog.ip_address && (
                                <div className="px-6 py-3 border-t bg-slate-50/50 flex items-center gap-4">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">IP</span>
                                    <span className="text-xs font-mono text-slate-600">{selectedLog.ip_address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
