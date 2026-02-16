"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import type { Clinic, WorkingHours, DayOfWeek, SubscriptionPlan } from "@/types/database";
import { UserRole } from "@/types/database";
import { DEFAULT_WORKING_HOURS } from "@/constants/days";
import { PLAN_IDS } from "@/constants/plans";
import { SummaryCards } from "@/app/components/platform/clinics/SummaryCards";
import { SuperAdminList } from "@/app/components/platform/clinics/SuperAdminList";
import { ClinicList } from "@/app/components/platform/clinics/ClinicList";
import { ClinicModal } from "@/app/components/platform/clinics/ClinicModal";

type SuperAdminUser = { id: string; full_name: string | null; email: string | null; created_at: string };


export default function PlatformClinicsPage() {
  const clinic = useClinic();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  // Form alanları
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formWorkingHours, setFormWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
  const [formPlanId, setFormPlanId] = useState<string>(PLAN_IDS.STARTER);
  const [formCredits, setFormCredits] = useState(0);
  const [formTrialEndsAt, setFormTrialEndsAt] = useState("");
  const [formAutomationsEnabled, setFormAutomationsEnabled] = useState(false);
  const [formN8nWorkflowId, setFormN8nWorkflowId] = useState("");
  const [formN8nWorkflows, setFormN8nWorkflows] = useState<{ id: string, name: string, enabled: boolean }[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [n8nWorkflows, setN8nWorkflows] = useState<{ id: string, name: string, active: boolean }[]>([]);
  const [n8nSearch, setN8nSearch] = useState("");
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

    const [clinicsRes, superRes, plansRes] = await Promise.all([
      supabase.from("clinics").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id, full_name, email, created_at").eq("role", UserRole.SUPER_ADMIN).order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("*").order("monthly_price", { ascending: true }),
    ]);

    if (clinicsRes.error) {
      setError(clinicsRes.error.message || "Klinikler yüklenemedi.");
      setLoading(false);
      return;
    }
    setClinics(clinicsRes.data || []);

    if (!superRes.error) setSuperAdmins(superRes.data || []);
    if (!plansRes.error) setPlans(plansRes.data || []);

    // n8n workflowlarını çek
    try {
      const token = await getAccessToken();
      const wfRes = await fetch("/api/admin/n8n/workflows", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (wfRes.ok) {
        const wfData = await wfRes.json();
        setN8nWorkflows(wfData);
      }
    } catch (e) {
      console.error("Workflow fetch error:", e);
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
          working_hours: formWorkingHours,
          plan_id: formPlanId,
          credits: formCredits,
          trial_ends_at: formTrialEndsAt || null,
          automations_enabled: formAutomationsEnabled,
          n8n_workflow_id: formN8nWorkflowId || null,
          n8n_workflows: formN8nWorkflows,
          adminPassword: formAdminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Klinik oluşturulamadı.");
      }

      setFormName("");
      setFormSlug("");
      setFormPhone("");
      setFormEmail("");
      setFormAdminPassword("");
      setFormAddress("");
      setFormWorkingHours(DEFAULT_WORKING_HOURS);
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
          working_hours: formWorkingHours,
          plan_id: formPlanId,
          credits: formCredits,
          trial_ends_at: formTrialEndsAt || null,
          automations_enabled: formAutomationsEnabled,
          n8n_workflow_id: formN8nWorkflowId || null,
          n8n_workflows: formN8nWorkflows,
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

  const toggleAutomation = async (enabled: boolean, workflowId: string) => {
    if (!selectedClinic || !workflowId) return;

    // UI'da hemen güncelle
    setFormN8nWorkflows(prev => prev.map(wf => wf.id === workflowId ? { ...wf, enabled } : wf));

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/admin/clinics/automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clinicId: selectedClinic.id,
          enabled,
          workflowId
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Otomasyon güncellenemedi.");
        // Geri al
        setFormN8nWorkflows(prev => prev.map(wf => wf.id === workflowId ? { ...wf, enabled: !enabled } : wf));
      } else {
        await loadClinics();
      }
    } catch {
      setError("Bağlantı hatası oluştu.");
      setFormN8nWorkflows(prev => prev.map(wf => wf.id === workflowId ? { ...wf, enabled: !enabled } : wf));
    }
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
    setFormPlanId(clinicItem.plan_id || PLAN_IDS.STARTER);
    setFormCredits(clinicItem.credits || 0);
    setFormTrialEndsAt(clinicItem.trial_ends_at ? new Date(clinicItem.trial_ends_at).toISOString().slice(0, 16) : "");
    setFormAutomationsEnabled(clinicItem.automations_enabled || false);
    setFormN8nWorkflowId(clinicItem.n8n_workflow_id || "");
    setFormN8nWorkflows(clinicItem.n8n_workflows || []);
    setN8nSearch("");
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
    setFormWorkingHours(DEFAULT_WORKING_HOURS);
    setFormPlanId("trial");
    setFormCredits(100); // Trial için 100 kredi (3 modül testi için uygun)
    setFormTrialEndsAt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)); // 1 hafta deneme
    setFormAutomationsEnabled(false);
    setFormN8nWorkflowId("");
    setFormN8nWorkflows([]);
    setN8nSearch("");
    setSaving(false);
    setShowCreateModal(true);
  };

  const updateDaySchedule = (day: DayOfWeek, field: string, value: string | boolean) => {
    setFormWorkingHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };


  // Sadece SUPER_ADMIN erişebilir (Hooks çağrıldıktan sonra kontrol)
  if (!clinic.isSuperAdmin) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-600">
        Bu sayfaya erişim yetkiniz yok.
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <SummaryCards
        superAdminCount={superAdmins.length}
        clinicCount={clinics.length}
        onNewClinicClick={openCreateModal}
      />

      <SuperAdminList superAdmins={superAdmins} />

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
          {error}
        </p>
      )}

      <ClinicList
        clinics={clinics}
        plans={plans}
        loading={loading}
        onEditClinic={openEditModal}
      />

      <ClinicModal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedClinic(null);
        }}
        title={showEditModal ? "Klinik Bilgilerini Düzenle" : "Yeni Klinik Oluştur"}
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
        formWorkingHours={formWorkingHours}
        updateDaySchedule={updateDaySchedule}
        formPlanId={formPlanId}
        setFormPlanId={setFormPlanId}
        formCredits={formCredits}
        setFormCredits={setFormCredits}
        formTrialEndsAt={formTrialEndsAt}
        setFormTrialEndsAt={setFormTrialEndsAt}
        plans={plans}
        n8nSearch={n8nSearch}
        setN8nSearch={setN8nSearch}
        n8nWorkflows={n8nWorkflows}
        formN8nWorkflows={formN8nWorkflows}
        setFormN8nWorkflows={setFormN8nWorkflows}
        toggleAutomation={toggleAutomation}
      />

      {/* Deaktivasyon Onay Modalı */}
      {showDeactivateConfirm && selectedClinic && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDeactivateConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-xs mx-4 p-6 text-center animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mx-auto mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Emin misiniz?</h3>
            <p className="text-xs text-slate-500 mb-6">
              <b>{selectedClinic.name}</b> hesabını dondurmak üzeresiniz. Bu klinik çalışanları panele erişemeyecektir.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeactivateConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                VAZGEÇ
              </button>
              <button
                type="button"
                onClick={() => handleToggleActive(selectedClinic)}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white shadow-lg shadow-rose-100 hover:bg-rose-700"
              >
                EVET, DONDUR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
