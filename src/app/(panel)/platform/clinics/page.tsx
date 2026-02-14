"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import type { Clinic, WorkingHours, DayOfWeek } from "@/app/types/database";
import { DEFAULT_WORKING_HOURS, DAY_LABELS, ORDERED_DAYS } from "@/app/types/database";

type SuperAdminUser = { id: string; full_name: string | null; email: string | null; created_at: string };
type ClinicStaffUser = { id: string; full_name: string | null; email: string | null; role: string; created_at: string };

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Yönetici",
  DOKTOR: "Doktor",
  SEKRETER: "Sekreter",
  FINANS: "Finans",
};

export default function PlatformClinicsPage() {
  const clinic = useClinic();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicStaff, setClinicStaff] = useState<ClinicStaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  // Form alanları
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formWorkingHours, setFormWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
  const [saving, setSaving] = useState(false);

  // Sadece SUPER_ADMIN erişebilir
  if (!clinic.isSuperAdmin) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-600">
        Bu sayfaya erişim yetkiniz yok.
      </div>
    );
  }

  const loadClinics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [clinicsRes, superRes] = await Promise.all([
      supabase.from("clinics").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id, full_name, email, created_at").eq("role", "SUPER_ADMIN").order("created_at", { ascending: false }),
    ]);

    if (clinicsRes.error) {
      setError(clinicsRes.error.message || "Klinikler yüklenemedi.");
      setLoading(false);
      return;
    }
    setClinics(clinicsRes.data || []);

    if (!superRes.error) setSuperAdmins(superRes.data || []);
    setLoading(false);
  }, []);

  const loadClinicStaff = useCallback(async (clinicId: string) => {
    setStaffLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, email, role, created_at")
      .eq("clinic_id", clinicId)
      .order("role", { ascending: true });

    if (error) {
      setClinicStaff([]);
    } else {
      setClinicStaff(data || []);
    }
    setStaffLoading(false);
  }, []);

  useEffect(() => {
    loadClinics();
  }, [loadClinics]);

  useEffect(() => {
    if (selectedClinic) loadClinicStaff(selectedClinic.id);
    else setClinicStaff([]);
  }, [selectedClinic, loadClinicStaff]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const slug = formSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (!formName.trim() || !slug) {
      setError("Klinik adı ve slug zorunludur.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("clinics").insert({
      name: formName.trim(),
      slug,
      phone: formPhone || null,
      email: formEmail || null,
      address: formAddress || null,
      working_hours: formWorkingHours,
    });

    if (error) {
      setError(error.message || "Klinik oluşturulamadı.");
      setSaving(false);
      return;
    }

    setFormName("");
    setFormSlug("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormWorkingHours(DEFAULT_WORKING_HOURS);
    setSaving(false);
    setShowCreateModal(false);
    await loadClinics();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic) return;
    setSaving(true);
    setError(null);

    const slug = formSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const { error } = await supabase
      .from("clinics")
      .update({
        name: formName.trim(),
        slug,
        phone: formPhone || null,
        email: formEmail || null,
        address: formAddress || null,
        working_hours: formWorkingHours,
      })
      .eq("id", selectedClinic.id);

    if (error) {
      setError(error.message || "Klinik güncellenemedi.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowEditModal(false);
    setSelectedClinic(null);
    await loadClinics();
  };

  const handleToggleActive = async (clinicItem: Clinic) => {
    setError(null);
    const { error } = await supabase
      .from("clinics")
      .update({ is_active: !clinicItem.is_active })
      .eq("id", clinicItem.id);

    if (error) {
      setError(error.message || "Durum güncellenemedi.");
      return;
    }

    setShowDeactivateConfirm(false);
    setShowEditModal(false);
    setSelectedClinic(null);
    await loadClinics();
  };

  const openEditModal = (clinicItem: Clinic) => {
    setSelectedClinic(clinicItem);
    setFormName(clinicItem.name);
    setFormSlug(clinicItem.slug);
    setFormPhone(clinicItem.phone || "");
    setFormEmail(clinicItem.email || "");
    setFormAddress(clinicItem.address || "");
    setFormWorkingHours(clinicItem.working_hours || DEFAULT_WORKING_HOURS);
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setFormName("");
    setFormSlug("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormWorkingHours(DEFAULT_WORKING_HOURS);
    setShowCreateModal(true);
  };

  const updateDaySchedule = (day: DayOfWeek, field: string, value: string | boolean) => {
    setFormWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const WorkingHoursEditor = () => (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium text-slate-800">
        Çalışma Günleri ve Saatleri
      </label>
      <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
        {ORDERED_DAYS.map((day) => {
          const schedule = formWorkingHours[day];
          return (
            <div
              key={day}
              className={[
                "flex items-center gap-2 px-3 py-2 text-[11px]",
                schedule.enabled ? "" : "opacity-50 bg-slate-50",
              ].join(" ")}
            >
              <label className="flex items-center gap-2 w-24 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={(e) => updateDaySchedule(day, "enabled", e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="font-medium text-slate-800">{DAY_LABELS[day]}</span>
              </label>
              <input
                type="time"
                value={schedule.open}
                onChange={(e) => updateDaySchedule(day, "open", e.target.value)}
                disabled={!schedule.enabled}
                className="rounded-md border px-1.5 py-0.5 text-[11px] w-20"
              />
              <span className="text-slate-400">-</span>
              <input
                type="time"
                value={schedule.close}
                onChange={(e) => updateDaySchedule(day, "close", e.target.value)}
                disabled={!schedule.enabled}
                className="rounded-md border px-1.5 py-0.5 text-[11px] w-20"
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Üst özet kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Super Admin</p>
              <p className="text-lg font-bold text-slate-900">{superAdmins.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-sm">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Toplam Klinik</p>
              <p className="text-lg font-bold text-slate-900">{clinics.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm flex items-center justify-center">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-teal-700 hover:to-emerald-600 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Yeni Klinik
          </button>
        </div>
      </div>

      {/* Super Admin listesi */}
      {superAdmins.length > 0 && (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
                <svg className="h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Super Admin Kullanıcıları</h2>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {superAdmins.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2 text-[11px]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                    {(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{u.full_name || "-"}</p>
                    <p className="text-slate-500 truncate max-w-[180px]">{u.email || "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
          {error}
        </p>
      )}

      {/* Klinik listesi */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Klinikler</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Kartı tıklayarak bilgileri görüntüleyip düzenleyebilirsiniz</p>
        </div>
        <div className="p-4 md:p-5">
          {loading && (
            <div className="py-8 text-center text-slate-500 text-sm">
              Klinikler yükleniyor...
            </div>
          )}

          {!loading && clinics.length === 0 && (
            <div className="py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mx-auto mb-3">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>
              </div>
              <p className="text-sm text-slate-600">Henüz klinik yok</p>
              <p className="text-xs text-slate-400 mt-1">Yeni klinik ekleyerek başlayın</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {clinics.map((c, index) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openEditModal(c)}
                className={[
                  "w-full min-h-[140px] rounded-xl border-l-4 p-4 text-left transition-all hover:shadow-md flex flex-col",
                  c.is_active
                    ? index % 2 === 0
                      ? "bg-gradient-to-br from-white to-teal-50/40 border-slate-200 border-l-teal-500 hover:border-l-teal-600 hover:shadow-teal-100"
                      : "bg-gradient-to-br from-slate-50/80 to-emerald-50/40 border-slate-200 border-l-emerald-500 hover:border-l-emerald-600 hover:shadow-emerald-100"
                    : "bg-slate-50/80 border-slate-200 border-l-slate-400 opacity-90",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3 flex-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-[11px] font-semibold text-white shadow-sm shrink-0">
                        {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">{c.name}</h3>
                        <p className="text-[10px] text-slate-500 truncate">/{c.slug}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 space-y-0.5 text-[11px] text-slate-600">
                      {c.phone && <p>Tel: {c.phone}</p>}
                      {c.email && <p className="truncate">E-posta: {c.email}</p>}
                      {c.address && <p className="truncate text-slate-500">Adres: {c.address}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={["inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", c.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"].join(" ")}>
                      {c.is_active ? "Aktif" : "Pasif"}
                    </span>
                    <span className="text-[10px] text-slate-400">Kayıt: {new Date(c.created_at).toLocaleDateString("tr-TR")}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">Detay ve düzenleme için tıklayın</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Yeni Klinik Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Yeni Klinik Oluştur</h3>
                  <p className="text-xs text-teal-100">Platform yönetimi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Klinik adı
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      // Otomatik slug oluştur
                      if (!showEditModal) {
                        setFormSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/ş/g, "s")
                            .replace(/ğ/g, "g")
                            .replace(/ı/g, "i")
                            .replace(/ö/g, "o")
                            .replace(/ü/g, "u")
                            .replace(/ç/g, "c")
                            .replace(/\s+/g, "-")
                            .replace(/[^a-z0-9-]/g, "")
                        );
                      }
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Örn: Güler Diş Kliniği"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Slug (URL tanımlayıcı)
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="guler-dis-klinigi"
                  />
                  <p className="text-[10px] text-slate-500">
                    Küçük harf, tire ile ayrılmış. Benzersiz olmalı.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">Telefon</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      placeholder="0212 xxx xx xx"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">E-posta</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      placeholder="info@klinik.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Adres</label>
                  <textarea
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    rows={2}
                    placeholder="Klinik adresi..."
                  />
                </div>
                <WorkingHoursEditor />
                {/* Footer */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg border px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-gradient-to-r from-teal-700 to-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:shadow-md transition-all disabled:opacity-60"
                  >
                    {saving ? "Oluşturuluyor..." : "Oluştur"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Düzenleme Modal */}
      {showEditModal && selectedClinic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowEditModal(false); setSelectedClinic(null); }}>
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-500 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Kliniği Düzenle</h3>
                  <p className="text-xs text-slate-200">Platform yönetimi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedClinic(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Klinik adı</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Slug</label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">Telefon</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">E-posta</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Adres</label>
                  <textarea
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    rows={2}
                  />
                </div>
                <WorkingHoursEditor />
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">Klinik ID</label>
                  <input
                    type="text"
                    value={selectedClinic.id}
                    disabled
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-slate-50 text-slate-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Bu ID, klinik kullanıcıları oluştururken gerekir.
                  </p>
                </div>

                {/* Personel */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-700">Kliniğe Bağlı Personel ({clinicStaff.length})</label>
                  {staffLoading ? (
                    <p className="text-[11px] text-slate-400">Yükleniyor...</p>
                  ) : clinicStaff.length === 0 ? (
                    <p className="text-[11px] text-slate-500 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2">Bu klinikte henüz personel kaydı yok.</p>
                  ) : (
                    <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {clinicStaff.map((u) => (
                        <div key={u.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700 shrink-0">
                              {(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate">{u.full_name || "-"}</p>
                              <p className="text-slate-500 truncate">{u.email || "-"}</p>
                            </div>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shrink-0">
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div>
                    {selectedClinic.is_active ? (
                      <button
                        type="button"
                        onClick={() => setShowDeactivateConfirm(true)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                      >
                        Pasife Al
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(selectedClinic)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        Aktif Et
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedClinic(null);
                      }}
                      className="rounded-lg border px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:shadow-md transition-all disabled:opacity-60"
                    >
                      {saving ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pasife Al onay penceresi */}
      {showDeactivateConfirm && selectedClinic && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDeactivateConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-600 via-red-500 to-rose-500 px-5 py-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Kliniği pasife al</h3>
                <p className="text-xs text-red-100">Bu işlem geri alınabilir</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{selectedClinic.name}</span> kliniğini pasif etmek istediğinize emin misiniz?
              </p>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeactivateConfirm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handleToggleActive(selectedClinic)}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                Evet, pasife al
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
