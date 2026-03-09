"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole, Announcement, Clinic } from "@/types/database";
import { SuperAdminList } from "@/app/components/platform/clinics/SuperAdminList";
import { usePageHeader } from "@/app/components/AppShell";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type SuperAdminUser = { id: string; full_name: string | null; email: string | null; created_at: string };

export default function PlatformSettingsPage() {
  usePageHeader("Sistem Ayarları", "Platform genel ayarlarını ve yönetici kadrosunu yönetin.");
  const clinic = useClinic();

  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Announcement Form
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState<Announcement['type']>("info");
  const [annTarget, setAnnTarget] = useState<string>("all");
  // Helper to get local ISO string for datetime-local input
  const getLocalISOString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [annStartsAt, setAnnStartsAt] = useState<string>(getLocalISOString());
  const [annExpiresAt, setAnnExpiresAt] = useState<string>("");
  const [annSaving, setAnnSaving] = useState(false);

  const [pricing, setPricing] = useState({
    monthly: 1499,
    annual: 14990,
    trialDays: 7,
    smsAddonPrice: 399,
  });

  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [adminsRes, clinicsRes, annRes, settingsRes] = await Promise.all([
      supabase.from("users").select("id, full_name, email, created_at").eq("role", UserRole.SUPER_ADMIN).order("created_at", { ascending: false }),
      supabase.from("clinics").select("*").order("name"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("platform_settings").select("*").eq("id", "global").single()
    ]);

    if (!adminsRes.error) setSuperAdmins(adminsRes.data || []);
    if (!clinicsRes.error) setClinics(clinicsRes.data || []);
    if (!annRes.error) setAnnouncements(annRes.data || []);
    if (!settingsRes.error && settingsRes.data) {
      setPricing({
        monthly: settingsRes.data.monthly_price,
        annual: settingsRes.data.annual_price,
        trialDays: settingsRes.data.trial_days,
        smsAddonPrice: settingsRes.data.sms_addon_price,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (clinic.isSuperAdmin) {
      loadData();
    }
  }, [loadData, clinic.isSuperAdmin]);

  const handlePricingSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("platform_settings").upsert({
      id: "global",
      monthly_price: pricing.monthly,
      annual_price: pricing.annual,
      trial_days: pricing.trialDays,
      sms_addon_price: pricing.smsAddonPrice,
      updated_at: new Date().toISOString()
    });

    if (!error) {
      setSaving(false);
      setActiveModal(null);
    } else {
      console.error("Pricing save error:", error);
      alert(`Hata: ${error.message}`);
      setSaving(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    setAnnSaving(true);

    // Convert local datetime string to proper Date object for database
    const startAtDate = annStartsAt ? new Date(annStartsAt).toISOString() : null;
    const expiresAtDate = annExpiresAt ? new Date(annExpiresAt).toISOString() : null;

    const { error } = await supabase.from("announcements").insert({
      title: annTitle,
      content: annContent,
      type: annType,
      target_clinic_id: annTarget === "all" ? null : annTarget,
      starts_at: startAtDate,
      expires_at: expiresAtDate,
      created_by: (await supabase.auth.getUser()).data.user?.id
    });

    if (!error) {
      setAnnTitle("");
      setAnnContent("");
      setAnnType("info");
      setAnnTarget("all");
      setAnnStartsAt(getLocalISOString());
      setAnnExpiresAt("");
      await loadData();
    }
    setAnnSaving(false);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Bu duyuruyu silmek istediğinizden emin misiniz?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (!error) await loadData();
  };

  const SettingCard = ({ icon, title, subtitle, onClick }: { icon: React.ReactNode, title: string, subtitle: string, onClick: () => void }) => (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-slate-300 transition-all duration-500 active:scale-[0.98] text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 shadow-lg shadow-slate-200 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 mb-6">
        {icon}
      </div>
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h3>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-relaxed">{subtitle}</p>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SettingCard
          onClick={() => setActiveModal("pricing")}
          icon={
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
          title="Fiyatlandırma"
          subtitle="Paket ücretleri ve deneme süreleri"
        />

        <SettingCard
          onClick={() => setActiveModal("admins")}
          icon={
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          }
          title="Yöneticiler"
          subtitle="Super Admin kullanıcı listesi"
        />

        <SettingCard
          onClick={() => setActiveModal("announcements")}
          icon={
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.062.51.11.77.143l3.61 2.888a.75.75 0 0 0 1.25-.561V5.722a.75.75 0 0 0-1.25-.561l-3.61 2.888a24.42 24.42 0 0 1-.77.143m0 9.18V8.752" />
            </svg>
          }
          title="Duyurular"
          subtitle="Global sistem bildirimleri"
        />
      </div>

      {/* Pricing Modal */}
      {activeModal === "pricing" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md px-4" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Fiyatlandırma Ayarları</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aylık Ücret (₺)</label>
                  <input type="number" value={pricing.monthly} onChange={e => setPricing({ ...pricing, monthly: +e.target.value })} className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 font-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Yıllık Ücret (₺)</label>
                  <input type="number" value={pricing.annual} onChange={e => setPricing({ ...pricing, annual: +e.target.value })} className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 font-black" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deneme Süresi (Gün)</label>
                  <input type="number" value={pricing.trialDays} onChange={e => setPricing({ ...pricing, trialDays: +e.target.value })} className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 font-black" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SMS Paket Ücreti (₺)</label>
                  <input type="number" value={pricing.smsAddonPrice} onChange={e => setPricing({ ...pricing, smsAddonPrice: +e.target.value })} className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 font-black" />
                </div>
              </div>
              <button onClick={handlePricingSave} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest mt-4">
                {saving ? "Güncelleniyor..." : "Ayarları Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admins Modal */}
      {activeModal === "admins" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md px-4" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Super Admin Listesi</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <SuperAdminList superAdmins={superAdmins} />
            </div>
          </div>
        </div>
      )}

      {/* Announcements Modal */}
      {activeModal === "announcements" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md px-4" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.062.51.11.77.143l3.61 2.888a.75.75 0 0 0 1.25-.561V5.722a.75.75 0 0 0-1.25-.561l-3.61 2.888a24.42 24.42 0 0 1-.77.143m0 9.18V8.752" />
                  </svg>
                </div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Duyuru Yönetimi</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* New Announcement Form */}
              <form onSubmit={handleCreateAnnouncement} className="space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Yeni Duyuru Yayınla</h3>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Duyuru Başlığı</label>
                  <input
                    required
                    value={annTitle}
                    onChange={e => setAnnTitle(e.target.value)}
                    placeholder="Örn: Sistem Bakımı Hakkında"
                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-bold focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Duyuru İçeriği</label>
                  <textarea
                    required
                    rows={5}
                    value={annContent}
                    onChange={e => setAnnContent(e.target.value)}
                    placeholder="Duyuru detaylarını buraya yazın..."
                    className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-medium focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tip</label>
                    <select
                      value={annType}
                      onChange={e => setAnnType(e.target.value as any)}
                      className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none cursor-pointer"
                    >
                      <option value="info">Bilgi (Mavi)</option>
                      <option value="warning">Uyarı (Sarı)</option>
                      <option value="danger">Kritik (Kırmızı)</option>
                      <option value="success">Başarı (Yeşil)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hedef Kitle</label>
                    <select
                      value={annTarget}
                      onChange={e => setAnnTarget(e.target.value)}
                      className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none cursor-pointer"
                    >
                      <option value="all">Tüm Klinikler</option>
                      {clinics.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Yayın Başlangıcı</label>
                    <input
                      type="datetime-local"
                      value={annStartsAt}
                      onChange={e => setAnnStartsAt(e.target.value)}
                      className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Yayın Bitişi (Opsiyonel)</label>
                    <input
                      type="datetime-local"
                      value={annExpiresAt}
                      onChange={e => setAnnExpiresAt(e.target.value)}
                      className="w-full rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none"
                    />
                  </div>
                </div>

                <button
                  disabled={annSaving}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {annSaving ? "Yayınlanıyor..." : "Duyuruyu Yayınla"}
                </button>
              </form>

              {/* Existing Announcements List */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Geçmiş Duyurular</h3>
                <div className="space-y-4">
                  {announcements.length === 0 ? (
                    <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                      <p className="text-xs font-bold text-slate-400 uppercase">Henüz duyuru bulunmuyor.</p>
                    </div>
                  ) : (
                    announcements.map(ann => (
                      <div key={ann.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 group relative">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${ann.type === 'danger' ? 'bg-rose-500' :
                                ann.type === 'warning' ? 'bg-amber-500' :
                                  ann.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                                }`} />
                              <h4 className="text-sm font-black text-slate-900 line-clamp-1">{ann.title}</h4>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{ann.content}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">
                                {format(new Date(ann.created_at), 'd MMM yyyy, HH:mm', { locale: tr })}
                              </span>
                              {ann.starts_at && (
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tight">
                                  BŞL: {format(new Date(ann.starts_at), 'd MMM, HH:mm', { locale: tr })}
                                </span>
                              )}
                              {ann.expires_at && (
                                <span className="text-[9px] font-black text-rose-400 uppercase tracking-tight">
                                  BTŞ: {format(new Date(ann.expires_at), 'd MMM, HH:mm', { locale: tr })}
                                </span>
                              )}
                              {ann.target_clinic_id && (
                                <span className="text-[9px] font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full uppercase tracking-tight">
                                  Özel Hedef
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
