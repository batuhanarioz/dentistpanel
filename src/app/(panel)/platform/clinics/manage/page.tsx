"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import type { Clinic } from "@/types/database";
import { UserRole } from "@/types/database";
import { SummaryCards } from "@/app/components/platform/clinics/SummaryCards";
import { ClinicList } from "@/app/components/platform/clinics/ClinicList";
import { ClinicModal } from "@/app/components/platform/clinics/ClinicModal";
import { ClinicDetailPanel } from "@/app/components/platform/clinics/ClinicDetailPanel";
import { usePageHeader } from "@/app/components/AppShell";

export default function PlatformClinicsManagePage() {
  usePageHeader("Klinik Yönetimi");
  const clinic = useClinic();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSlugInput, setDeleteSlugInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [detailClinic, setDetailClinic] = useState<Clinic | null>(null);

  // Form alanları
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");

  // Subscription States
  const [subStatus, setSubStatus] = useState("trialing");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [periodEnd, setPeriodEnd] = useState("");
  const [lastPayment, setLastPayment] = useState("");

  const [formAdminPassword, setFormAdminPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const loadClinics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("clinics")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message || "Klinikler yüklenemedi.");
    } else {
      setClinics(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (clinic.isSuperAdmin) {
      loadClinics();
    }
  }, [loadClinics, clinic.isSuperAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const slug = formSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (!formName.trim() || !slug || !formEmail.trim() || !formAdminPassword.trim()) {
      setError("Klinik adı, slug, e-posta ve admin şifresi zorunludur.");
      setSaving(false);
      return;
    }

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/clinics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName.trim(),
          slug,
          phone: formPhone || null,
          email: formEmail.trim(),
          address: formAddress || null,
          subscription_status: subStatus,
          billing_cycle: billingCycle,
          current_period_end: periodEnd || null,
          last_payment_date: lastPayment || null,
          adminPassword: formAdminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Klinik oluşturulamadı.");
      }

      setSaving(false);
      setShowCreateModal(false);
      await loadClinics();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu";
      setError(message);
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic) return;
    setSaving(true);
    setError(null);

    const slug = formSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    try {
      const { error } = await supabase
        .from("clinics")
        .update({
          name: formName.trim(),
          slug,
          phone: formPhone || null,
          email: formEmail || null,
          address: formAddress || null,
          subscription_status: subStatus,
          billing_cycle: billingCycle,
          current_period_end: periodEnd || null,
          last_payment_date: lastPayment || null,
        })
        .eq("id", selectedClinic.id);

      if (error) throw error;

      setSaving(false);
      setShowEditModal(false);
      setSelectedClinic(null);
      await loadClinics();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Klinik güncellenemedi.";
      setError(message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClinic || deleteSlugInput !== selectedClinic.slug) return;
    setDeleting(true);
    setError(null);
    const { error } = await supabase.from("clinics").delete().eq("id", selectedClinic.id);
    if (error) {
      setError(error.message || "Klinik silinemedi.");
      setDeleting(false);
      return;
    }
    setDeleting(false);
    setShowDeleteConfirm(false);
    setShowEditModal(false);
    setSelectedClinic(null);
    setDeleteSlugInput("");
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

    setSubStatus(clinicItem.subscription_status || "trialing");
    setBillingCycle(clinicItem.billing_cycle || "monthly");
    setPeriodEnd(clinicItem.current_period_end ? new Date(clinicItem.current_period_end).toISOString().slice(0, 16) : "");
    setLastPayment(clinicItem.last_payment_date ? new Date(clinicItem.last_payment_date).toISOString().slice(0, 16) : "");

    setSaving(false);
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setFormName("");
    setFormSlug("");
    setFormPhone("");
    setFormEmail("");
    setFormAdminPassword("");
    setFormAddress("");
    setSubStatus("trialing");
    setBillingCycle("monthly");
    setPeriodEnd(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setLastPayment(new Date().toISOString().slice(0, 16));
    setSaving(false);
    setShowCreateModal(true);
  };

  if (!clinic.isSuperAdmin) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-600">
        Bu sayfaya erişim yetkiniz yok.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2.5 rounded-2xl bg-slate-900 px-6 py-3.5 text-xs font-black text-white shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all uppercase tracking-widest border border-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Yeni Klinik Ekle
          </button>
        </div>

        {/* Top Section: Metrics */}
        <div className="max-w-3xl">
          <SummaryCards
            superAdminCount={0} // Not shown in compact
            clinicCount={clinics.length}
            onNewClinicClick={openCreateModal}
            compact
          />

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 flex items-center gap-3 text-xs font-bold text-rose-700 mt-6 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Main Section: Clinic Records */}
        <div className="space-y-4">
          <ClinicList
            clinics={clinics}
            loading={loading}
            onEditClinic={openEditModal}
            onViewClinic={(c) => { setDetailClinic(c); setShowDetailPanel(true); }}
          />
        </div>
      </div>

      <ClinicModal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedClinic(null);
        }}
        title={showEditModal ? "Klinik Bilgilerini Düzenle" : "Yeni Klinik Tanımla"}
        isEdit={showEditModal}
        saving={saving}
        onSubmit={showEditModal ? handleUpdate : handleCreate}
        formName={formName}
        setFormName={setFormName}
        formSlug={formSlug}
        setFormSlug={setFormSlug}
        formPhone={formPhone}
        setFormPhone={setFormPhone}
        formEmail={formEmail}
        setFormEmail={setFormEmail}
        formAddress={formAddress}
        setFormAddress={setFormAddress}
        formAdminPassword={formAdminPassword}
        setFormAdminPassword={setFormAdminPassword}
        subscriptionStatus={subStatus}
        setSubscriptionStatus={setSubStatus}
        billingCycle={billingCycle}
        setBillingCycle={setBillingCycle}
        currentPeriodEnd={periodEnd}
        setCurrentPeriodEnd={setPeriodEnd}
        lastPaymentDate={lastPayment}
        setLastPaymentDate={setLastPayment}
        onDeleteClinic={showEditModal && selectedClinic ? () => {
          setDeleteSlugInput("");
          setShowDeleteConfirm(true);
        } : undefined}
      />

      {showDeleteConfirm && selectedClinic && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border w-full max-w-sm mx-4 p-8 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 mx-auto mb-5">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center mb-1 uppercase tracking-tight">Kliniği Kalıcı Sil</h3>
            <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed font-medium">
              <b className="text-rose-600">{selectedClinic.name}</b> kliniği ve tüm ilişkili veriler <b>kalıcı olarak silinecek</b>. Bu işlem geri alınamaz.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight">
                  Onaylamak için klinik slug&apos;ını yazın: <span className="text-rose-600">{selectedClinic.slug}</span>
                </label>
                <input
                  type="text"
                  value={deleteSlugInput}
                  onChange={(e) => setDeleteSlugInput(e.target.value)}
                  placeholder={selectedClinic.slug}
                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>
              <button
                type="button"
                disabled={deleteSlugInput !== selectedClinic.slug || deleting}
                onClick={handleDelete}
                className="w-full rounded-2xl bg-rose-600 py-3.5 text-[11px] font-black tracking-widest text-white shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all uppercase disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {deleting ? "SİLİNİYOR..." : "KALICI OLARAK SİL"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full rounded-2xl border border-slate-200 py-3 text-[11px] font-black tracking-widest text-slate-500 hover:bg-slate-50 active:scale-95 transition-all uppercase"
              >
                VAZGEÇ
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeactivateConfirm && selectedClinic && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDeactivateConfirm(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl border w-full max-w-sm mx-4 p-10 text-center animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 mx-auto mb-6">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Emin misiniz?</h3>
            <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">
              <b className="text-slate-900">{selectedClinic.name}</b> hesabını dondurmak üzeresiniz. Bu işlem kliniğin tüm erişimini anında kesecektir.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleToggleActive(selectedClinic)}
                className="w-full rounded-2xl bg-rose-600 py-4 text-xs font-black tracking-widest text-white shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all uppercase"
              >
                EVET, DONDUR
              </button>
              <button
                type="button"
                onClick={() => setShowDeactivateConfirm(false)}
                className="w-full rounded-2xl border border-slate-200 py-3.5 text-xs font-black tracking-widest text-slate-500 hover:bg-slate-50 active:scale-95 transition-all uppercase"
              >
                VAZGEÇ
              </button>
            </div>
          </div>
        </div>
      )}

      <ClinicDetailPanel
        clinic={detailClinic}
        isOpen={showDetailPanel}
        onClose={() => { setShowDetailPanel(false); setDetailClinic(null); }}
        onClinicUpdated={(updated) => {
          setClinics(prev => prev.map(c => c.id === updated.id ? updated : c));
          setDetailClinic(updated);
        }}
      />
    </div>
  );
}
