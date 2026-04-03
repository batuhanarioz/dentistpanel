"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole, Announcement, Clinic } from "@/types/database";
import { toast } from "react-hot-toast";
import { useConfirm } from "@/app/context/ConfirmContext";
import { SuperAdminList } from "@/app/components/platform/clinics/SuperAdminList";
import { usePageHeader } from "@/app/components/AppShell";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type SuperAdminUser = { id: string; full_name: string | null; email: string | null; created_at: string };

type DiscountCode = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  applies_to: "monthly" | "annual" | "both";
  is_recurring: boolean;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
};

export default function PlatformSettingsPage() {
  usePageHeader("Sistem Ayarları");
  const clinic = useClinic();
  const { confirm } = useConfirm();

  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [previewAnn, setPreviewAnn] = useState<Announcement | null>(null);

  // Announcement Form
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState<Announcement["type"]>("info");
  const [annTarget, setAnnTarget] = useState<string>("all");
  const getLocalISOString = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [annStartsAt, setAnnStartsAt] = useState<string>(getLocalISOString());
  const [annExpiresAt, setAnnExpiresAt] = useState<string>("");
  const [annSaving, setAnnSaving] = useState(false);

  // Pricing
  const [pricing, setPricing] = useState({
    monthly: 1499,
    annual: 14990,
    trialDays: 7,
    smsAddonPrice: 399,
  });
  const [saving, setSaving] = useState(false);
  const [pricingSettingsLastSaved, setPricingSettingsLastSaved] = useState<string | null>(null);

  // Super Admin management
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Discount Codes
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [dcCode, setDcCode] = useState("");
  const [dcType, setDcType] = useState<"percent" | "fixed">("percent");
  const [dcValue, setDcValue] = useState<number>(10);
  const [dcAppliesTo, setDcAppliesTo] = useState<"monthly" | "annual" | "both">("both");
  const [dcIsRecurring, setDcIsRecurring] = useState(false);
  const [dcMaxUses, setDcMaxUses] = useState<string>("");
  const [dcValidUntil, setDcValidUntil] = useState<string>("");
  const [dcSaving, setDcSaving] = useState(false);
  const [dcFilterStatus, setDcFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [dcFilterApplies, setDcFilterApplies] = useState<"all" | "monthly" | "annual" | "both">("all");
  const [dcFilterType, setDcFilterType] = useState<"all" | "percent" | "fixed">("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [adminsRes, clinicsRes, annRes, settingsRes, dcRes] = await Promise.all([
      supabase.from("users").select("id, full_name, email, created_at").eq("role", UserRole.SUPER_ADMIN).order("created_at", { ascending: false }),
      supabase.from("clinics").select("*").order("name"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("platform_settings").select("*").eq("id", "global").single(),
      supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
    ]);

    if (!adminsRes.error) setSuperAdmins(adminsRes.data || []);
    if (!clinicsRes.error) setClinics(clinicsRes.data || []);
    if (!annRes.error) {
      const anns = annRes.data || [];
      setAnnouncements(anns);

      // Fetch read counts for all announcements
      if (anns.length > 0) {
        const ids = anns.map((a: Announcement) => a.id);
        const { data: reads } = await supabase
          .from("announcement_reads")
          .select("announcement_id")
          .in("announcement_id", ids);

        if (reads) {
          const counts: Record<string, number> = {};
          for (const r of reads) {
            counts[r.announcement_id] = (counts[r.announcement_id] || 0) + 1;
          }
          setReadCounts(counts);
        }
      }
    }

    if (!settingsRes.error && settingsRes.data) {
      setPricing({
        monthly: settingsRes.data.monthly_price,
        annual: settingsRes.data.annual_price,
        trialDays: settingsRes.data.trial_days,
        smsAddonPrice: settingsRes.data.sms_addon_price,
      });
      setPricingSettingsLastSaved(settingsRes.data.updated_at ?? null);
    }

    if (!dcRes.error) setDiscountCodes(dcRes.data || []);

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
      updated_at: new Date().toISOString(),
    });

    if (!error) {
      setSaving(false);
      setPricingSettingsLastSaved(new Date().toISOString());
      setActiveModal(null);
      toast.success("Fiyatlandırma ayarları başarıyla güncellendi.");
    } else {
      toast.error(`Hata: ${error.message}`);
      setSaving(false);
    }
  };

  const handlePromoteToSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteEmail.trim()) return;
    setPromoting(true);
    setPromoteError(null);
    setPromoteSuccess(null);

    // Find user by email
    const { data: userRes, error: findErr } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("email", promoteEmail.trim().toLowerCase())
      .single();

    if (findErr || !userRes) {
      setPromoteError("Bu e-posta adresine sahip kullanıcı bulunamadı.");
      setPromoting(false);
      return;
    }
    if (userRes.role === UserRole.SUPER_ADMIN) {
      setPromoteError("Bu kullanıcı zaten Super Admin.");
      setPromoting(false);
      return;
    }

    const { error: updateErr } = await supabase
      .from("users")
      .update({ role: UserRole.SUPER_ADMIN, clinic_id: null })
      .eq("id", userRes.id);

    if (updateErr) {
      setPromoteError(updateErr.message || "Yetki verilemedi.");
      setPromoting(false);
      return;
    }

    setPromoteSuccess(`${userRes.full_name || userRes.email} artık Super Admin.`);
    setPromoteEmail("");
    setPromoting(false);
    await loadData();
  };

  const handleRevokeAdmin = async (userId: string, name: string | null) => {
    confirm({
      title: "Yetkiyi Kaldır",
      message: `"${name || userId}" kullanıcısının Super Admin yetkisini almak istediğinizden emin misiniz?`,
      variant: "danger",
      onConfirm: async () => {
        setRevokingId(userId);

        const { error } = await supabase
          .from("users")
          .update({ role: UserRole.ADMIN })
          .eq("id", userId);

        setRevokingId(null);
        if (error) {
          toast.error(`Hata: ${error.message}`);
          return;
        }
        toast.success("Super Admin yetkisi kaldırıldı.");
        await loadData();
      }
    });
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    setAnnSaving(true);

    const startAtDate = annStartsAt ? new Date(annStartsAt).toISOString() : null;
    const expiresAtDate = annExpiresAt ? new Date(annExpiresAt).toISOString() : null;

    const { error } = await supabase.from("announcements").insert({
      title: annTitle,
      content: annContent,
      type: annType,
      target_clinic_id: annTarget === "all" ? null : annTarget,
      starts_at: startAtDate,
      expires_at: expiresAtDate,
      created_by: (await supabase.auth.getUser()).data.user?.id,
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
    confirm({
      title: "Duyuruyu Sil",
      message: "Bu duyuruyu silmek istediğinizden emin misiniz?",
      variant: "danger",
      onConfirm: async () => {
        const { error } = await supabase.from("announcements").delete().eq("id", id);
        if (error) {
          toast.error(`Hata: ${error.message}`);
          return;
        }
        toast.success("Duyuru silindi.");
        await loadData();
      }
    });
  };

  const handleCreateDiscountCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dcCode.trim() || dcValue <= 0) return;
    setDcSaving(true);

    const { error } = await supabase.from("discount_codes").insert({
      code: dcCode.trim().toUpperCase(),
      discount_type: dcType,
      discount_value: dcValue,
      applies_to: dcAppliesTo,
      is_recurring: dcIsRecurring,
      max_uses: dcMaxUses ? parseInt(dcMaxUses, 10) : null,
      valid_until: dcValidUntil ? new Date(dcValidUntil).toISOString() : null,
      is_active: true,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });

    if (error) {
      toast.error(error.message.includes("unique") ? "Bu kod zaten mevcut." : `Hata: ${error.message}`);
    } else {
      toast.success("İndirim kodu oluşturuldu.");
      setDcCode("");
      setDcValue(10);
      setDcType("percent");
      setDcAppliesTo("both");
      setDcIsRecurring(false);
      setDcMaxUses("");
      setDcValidUntil("");
      await loadData();
    }
    setDcSaving(false);
  };

  const handleToggleDiscountCode = async (id: string, current: boolean) => {
    await supabase.from("discount_codes").update({ is_active: !current }).eq("id", id);
    await loadData();
  };

  const handleDeleteDiscountCode = async (id: string, code: string) => {
    confirm({
      title: "Kodu Sil",
      message: `"${code}" kodunu silmek istediğinizden emin misiniz?`,
      variant: "danger",
      onConfirm: async () => {
        const { error } = await supabase.from("discount_codes").delete().eq("id", id);
        if (error) {
          toast.error(`Hata: ${error.message}`);
          return;
        }
        toast.success("İndirim kodu silindi.");
        await loadData();
      }
    });
  };

  const typeColors = {
    info: { dot: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: "text-blue-600" },
    warning: { dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icon: "text-amber-600" },
    danger: { dot: "bg-rose-500", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", icon: "text-rose-600" },
    success: { dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", icon: "text-emerald-600" },
  };

  const SettingCard = ({ icon, title, subtitle, onClick, badge }: {
    icon: React.ReactNode; title: string; subtitle: string; onClick: () => void; badge?: string;
  }) => (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-slate-300 transition-all duration-500 active:scale-[0.98] text-center"
    >
      {badge && (
        <span className="absolute top-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white">
          {badge}
        </span>
      )}
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 shadow-lg shadow-slate-200 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 mb-6">
        {icon}
      </div>
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h3>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-relaxed">{subtitle}</p>
    </button>
  );

  if (!clinic.isSuperAdmin) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-600">
        Bu sayfaya erişim yetkiniz yok.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <SettingCard
          onClick={() => setActiveModal("pricing")}
          icon={
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
          title="Fiyatlandırma"
          subtitle={pricingSettingsLastSaved ? `Son güncelleme: ${format(new Date(pricingSettingsLastSaved), "d MMM yyyy", { locale: tr })}` : "Paket ücretleri ve deneme süreleri"}
        />

        <SettingCard
          onClick={() => setActiveModal("admins")}
          icon={
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          }
          title="Yöneticiler"
          subtitle={loading ? "Yükleniyor..." : `${superAdmins.length} Super Admin aktif`}
          badge={String(superAdmins.length)}
        />

        <SettingCard
          onClick={() => setActiveModal("announcements")}
          icon={
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.062.51.11.77.143l3.61 2.888a.75.75 0 0 0 1.25-.561V5.722a.75.75 0 0 0-1.25-.561l-3.61 2.888a24.42 24.42 0 0 1-.77.143m0 9.18V8.752" />
            </svg>
          }
          title="Duyurular"
          subtitle={loading ? "Yükleniyor..." : `${announcements.length} duyuru aktif`}
          badge={announcements.length > 0 ? String(announcements.length) : undefined}
        />

        <SettingCard
          onClick={() => setActiveModal("discounts")}
          icon={
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          }
          title="İndirim Kodları"
          subtitle={loading ? "Yükleniyor..." : `${discountCodes.filter(d => d.is_active).length} aktif kod`}
          badge={discountCodes.length > 0 ? String(discountCodes.length) : undefined}
        />
      </div>

      {/* ── Pricing Modal ── */}
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
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Fiyatlandırma Ayarları</h2>
                  {pricingSettingsLastSaved && (
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      Son güncelleme: {format(new Date(pricingSettingsLastSaved), "d MMM yyyy, HH:mm", { locale: tr })}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Warning Banner */}
            <div className="mx-8 mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 flex items-start gap-3">
              <svg className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                Bu fiyatlar yalnızca <b>yeni abonelikler</b> için geçerlidir. Mevcut aktif abonelikler etkilenmez — klinik bazlı fiyat değişikliği için Klinik Yönetimi sayfasını kullanın.
              </p>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aylık Ücret (₺)</label>
                  <input type="number" value={pricing.monthly} onChange={e => setPricing({ ...pricing, monthly: +e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Yıllık Ücret (₺)</label>
                  <input type="number" value={pricing.annual} onChange={e => setPricing({ ...pricing, annual: +e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deneme Süresi (Gün)</label>
                  <input type="number" value={pricing.trialDays} onChange={e => setPricing({ ...pricing, trialDays: +e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SMS Paket Ücreti (₺)</label>
                  <input type="number" value={pricing.smsAddonPrice} onChange={e => setPricing({ ...pricing, smsAddonPrice: +e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all" />
                  <p className="text-[10px] text-slate-400 ml-1">SMS Paket eklentisi için abonelik ücreti. Eklenti Yönetimi&apos;nden atanır.</p>
                </div>
              </div>
              <button onClick={handlePricingSave} disabled={saving} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50">
                {saving ? "Güncelleniyor..." : "Ayarları Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admins Modal ── */}
      {activeModal === "admins" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md px-4" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Super Admin Yönetimi</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{superAdmins.length} aktif yönetici</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Promote Form */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Kullanıcıyı Super Admin Yap</h3>
                <form onSubmit={handlePromoteToSuperAdmin} className="flex gap-3">
                  <input
                    type="email"
                    value={promoteEmail}
                    onChange={e => setPromoteEmail(e.target.value)}
                    placeholder="kullanici@email.com"
                    required
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={promoting}
                    className="rounded-xl bg-violet-600 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {promoting ? "Aranıyor..." : "Yetki Ver"}
                  </button>
                </form>
                {promoteError && (
                  <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    {promoteError}
                  </p>
                )}
                {promoteSuccess && (
                  <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {promoteSuccess}
                  </p>
                )}
              </div>

              {/* Admin List */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Aktif Yöneticiler</h3>
                <SuperAdminList
                  superAdmins={superAdmins}
                  onRevoke={(id, name) => handleRevokeAdmin(id, name)}
                  revokingId={revokingId}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Announcements Modal ── */}
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
              <form onSubmit={handleCreateAnnouncement} className="space-y-5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Yeni Duyuru Yayınla</h3>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Duyuru Başlığı</label>
                  <input required value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Örn: Sistem Bakımı Hakkında" className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200 transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Duyuru İçeriği</label>
                  <textarea required rows={4} value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Duyuru detaylarını buraya yazın..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tip</label>
                    <select value={annType} onChange={e => setAnnType(e.target.value as Announcement["type"])} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none cursor-pointer">
                      <option value="info">Bilgi (Mavi)</option>
                      <option value="warning">Uyarı (Sarı)</option>
                      <option value="danger">Kritik (Kırmızı)</option>
                      <option value="success">Başarı (Yeşil)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hedef Kitle</label>
                    <select value={annTarget} onChange={e => setAnnTarget(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none cursor-pointer">
                      <option value="all">Tüm Klinikler</option>
                      {clinics.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Yayın Başlangıcı</label>
                    <input type="datetime-local" value={annStartsAt} onChange={e => setAnnStartsAt(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Yayın Bitişi (Ops.)</label>
                    <input type="datetime-local" value={annExpiresAt} onChange={e => setAnnExpiresAt(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!annTitle && !annContent) return;
                      setPreviewAnn({
                        id: "preview",
                        title: annTitle || "Duyuru Başlığı",
                        content: annContent || "Duyuru içeriği burada görünecek.",
                        type: annType,
                        target_clinic_id: null,
                        starts_at: null,
                        expires_at: null,
                        created_at: new Date().toISOString(),
                        created_by: null,
                      });
                    }}
                    className="flex-1 py-4 border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 active:scale-[0.98] transition-all text-[11px]"
                  >
                    Önizle
                  </button>
                  <button disabled={annSaving} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 text-[11px]">
                    {annSaving ? "Yayınlanıyor..." : "Duyuruyu Yayınla"}
                  </button>
                </div>
              </form>

              {/* Existing Announcements */}
              <div className="space-y-5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
                  Yayındaki Duyurular <span className="text-slate-300">({announcements.length})</span>
                </h3>
                <div className="space-y-3">
                  {announcements.length === 0 ? (
                    <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                      <p className="text-xs font-bold text-slate-400 uppercase">Henüz duyuru bulunmuyor.</p>
                    </div>
                  ) : (
                    announcements.map(ann => {
                      const c = typeColors[ann.type] || typeColors.info;
                      const readCount = readCounts[ann.id] || 0;
                      const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();
                      return (
                        <div key={ann.id} className={`p-4 rounded-2xl border ${isExpired ? "opacity-50" : ""} ${c.bg} ${c.border}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                                <h4 className={`text-xs font-black line-clamp-1 ${c.text}`}>{ann.title}</h4>
                                {isExpired && <span className="text-[9px] font-black text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full uppercase">Süresi Doldu</span>}
                              </div>
                              <p className={`text-[11px] line-clamp-2 leading-relaxed font-medium ${c.text} opacity-80`}>{ann.content}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">
                                  {format(new Date(ann.created_at), "d MMM yyyy, HH:mm", { locale: tr })}
                                </span>
                                {ann.target_clinic_id && (
                                  <span className="text-[9px] font-black text-slate-500 bg-white/60 px-1.5 py-0.5 rounded-full uppercase">Özel Hedef</span>
                                )}
                                {/* Read count */}
                                <span className="text-[9px] font-black text-slate-500 flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  {readCount} kullanıcı okudu
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setPreviewAnn(ann)}
                                className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/60 hover:bg-white text-slate-400 hover:text-slate-700 transition-all"
                                title="Önizle"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              </button>
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/60 hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all"
                                title="Sil"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Discount Codes Modal ── */}
      {activeModal === "discounts" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-md px-4" onClick={() => setActiveModal(null)}>
          <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-slate-900 p-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185ZM9.75 9h.008v.008H9.75V9Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008V13.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">İndirim Kodu Yönetimi</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {discountCodes.filter(d => d.is_active).length} aktif · {discountCodes.length} toplam
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* ── Yeni Kod Formu ── */}
              <form onSubmit={handleCreateDiscountCode} className="space-y-5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Yeni İndirim Kodu</h3>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kod Metni</label>
                  <input
                    required
                    value={dcCode}
                    onChange={e => setDcCode(e.target.value.toUpperCase())}
                    placeholder="YAZI2026"
                    maxLength={32}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-900 uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">İndirim Tipi</label>
                    <select value={dcType} onChange={e => setDcType(e.target.value as "percent" | "fixed")} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none cursor-pointer">
                      <option value="percent">Yüzde (%)</option>
                      <option value="fixed">Sabit (₺)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      {dcType === "percent" ? "İndirim (%)" : "İndirim (₺)"}
                    </label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={dcType === "percent" ? 100 : undefined}
                      value={dcValue}
                      onChange={e => setDcValue(+e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Geçerli Plan</label>
                    <select value={dcAppliesTo} onChange={e => setDcAppliesTo(e.target.value as "monthly" | "annual" | "both")} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none cursor-pointer">
                      <option value="both">Tümü</option>
                      <option value="monthly">Yalnızca Aylık</option>
                      <option value="annual">Yalnızca Yıllık</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Maks. Kullanım</label>
                    <input
                      type="number"
                      min={1}
                      value={dcMaxUses}
                      onChange={e => setDcMaxUses(e.target.value)}
                      placeholder="Sınırsız"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Geçerlilik Bitiş (Opsiyonel)</label>
                  <input
                    type="datetime-local"
                    value={dcValidUntil}
                    onChange={e => setDcValidUntil(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none"
                  />
                </div>

                {/* Recurring toggle */}
                <label className="flex items-center gap-3 cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 hover:border-emerald-300 transition-colors">
                  <div
                    onClick={() => setDcIsRecurring(!dcIsRecurring)}
                    className={`relative h-5 w-9 rounded-full transition-colors cursor-pointer ${dcIsRecurring ? "bg-emerald-500" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${dcIsRecurring ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-700">Her Dönem Geçerli</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {dcIsRecurring ? "İndirim her yenileme ödemesine uygulanır" : "Yalnızca ilk ödeme için geçerli"}
                    </p>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={dcSaving}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {dcSaving ? "Oluşturuluyor..." : "Kodu Oluştur"}
                </button>
              </form>

              {/* ── Kod Listesi ── */}
              <div className="space-y-5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
                  Kodlar <span className="text-slate-300">({discountCodes.length})</span>
                </h3>

                {/* Filtreler */}
                <div className="flex flex-wrap gap-2">
                  <select value={dcFilterStatus} onChange={e => setDcFilterStatus(e.target.value as typeof dcFilterStatus)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold outline-none cursor-pointer">
                    <option value="all">Tümü</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                  <select value={dcFilterApplies} onChange={e => setDcFilterApplies(e.target.value as typeof dcFilterApplies)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold outline-none cursor-pointer">
                    <option value="all">Tüm Planlar</option>
                    <option value="monthly">Aylık</option>
                    <option value="annual">Yıllık</option>
                    <option value="both">Her İkisi</option>
                  </select>
                  <select value={dcFilterType} onChange={e => setDcFilterType(e.target.value as typeof dcFilterType)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold outline-none cursor-pointer">
                    <option value="all">Tüm Tipler</option>
                    <option value="percent">Yüzde</option>
                    <option value="fixed">Sabit</option>
                  </select>
                </div>

                {/* Liste */}
                <div className="space-y-2">
                  {(() => {
                    const filtered = discountCodes.filter(d => {
                      if (dcFilterStatus === "active" && !d.is_active) return false;
                      if (dcFilterStatus === "inactive" && d.is_active) return false;
                      if (dcFilterApplies !== "all" && d.applies_to !== dcFilterApplies) return false;
                      if (dcFilterType !== "all" && d.discount_type !== dcFilterType) return false;
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                          <p className="text-xs font-bold text-slate-400 uppercase">Eşleşen kod bulunamadı.</p>
                        </div>
                      );
                    }

                    return filtered.map(dc => {
                      const isExpired = dc.valid_until && new Date(dc.valid_until) < new Date();
                      const atLimit = dc.max_uses !== null && dc.used_count >= dc.max_uses;
                      const effectivelyInactive = !dc.is_active || isExpired || atLimit;

                      return (
                        <div
                          key={dc.id}
                          className={`rounded-2xl border p-4 transition-all ${effectivelyInactive ? "border-slate-100 bg-slate-50 opacity-60" : "border-slate-200 bg-white"}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="font-black text-sm text-slate-900 tracking-widest uppercase">{dc.code}</span>
                                {/* İndirim badge */}
                                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                  {dc.discount_type === "percent" ? `%${dc.discount_value}` : `${dc.discount_value.toLocaleString("tr-TR")} ₺`}
                                </span>
                                {/* Plan badge */}
                                <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                                  {dc.applies_to === "both" ? "Tümü" : dc.applies_to === "monthly" ? "Aylık" : "Yıllık"}
                                </span>
                                {/* Recurring badge */}
                                {dc.is_recurring && (
                                  <span className="bg-violet-100 text-violet-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Her Dönem</span>
                                )}
                                {isExpired && (
                                  <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Süresi Doldu</span>
                                )}
                                {atLimit && (
                                  <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Limit Doldu</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                <span>{dc.used_count} kullanım{dc.max_uses ? ` / ${dc.max_uses}` : ""}</span>
                                {dc.valid_until && (
                                  <span>Bitiş: {format(new Date(dc.valid_until), "d MMM yyyy", { locale: tr })}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Toggle active */}
                              <button
                                onClick={() => handleToggleDiscountCode(dc.id, dc.is_active)}
                                className={`h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${dc.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                                title={dc.is_active ? "Pasife Al" : "Aktif Et"}
                              >
                                {dc.is_active ? "Aktif" : "Pasif"}
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteDiscountCode(dc.id, dc.code)}
                                className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all"
                                title="Sil"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Announcement Preview Modal ── */}
      {previewAnn && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setPreviewAnn(null)}>
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Simulated browser bar */}
            <div className="bg-slate-100 px-4 py-2 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="flex-1 mx-3 rounded-lg bg-white px-3 py-1 text-[10px] font-bold text-slate-400 truncate">
                Kullanıcı Ekranı Önizlemesi
              </div>
            </div>
            {/* Simulated page with announcement */}
            <div className="p-6 space-y-4 bg-slate-50">
              <div className={`rounded-2xl border px-5 py-4 flex items-start gap-3 ${typeColors[previewAnn.type].bg} ${typeColors[previewAnn.type].border}`}>
                <svg className={`h-5 w-5 shrink-0 mt-0.5 ${typeColors[previewAnn.type].icon}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  {previewAnn.type === "success"
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  }
                </svg>
                <div>
                  <p className={`text-sm font-black ${typeColors[previewAnn.type].text}`}>{previewAnn.title}</p>
                  <p className={`text-xs mt-1 leading-relaxed font-medium ${typeColors[previewAnn.type].text} opacity-80`}>{previewAnn.content}</p>
                </div>
              </div>
              <div className="h-12 rounded-2xl bg-slate-200/60 animate-pulse" />
              <div className="h-24 rounded-2xl bg-slate-200/60 animate-pulse" />
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button onClick={() => setPreviewAnn(null)} className="rounded-2xl border border-slate-200 px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
