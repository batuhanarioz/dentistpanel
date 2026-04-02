"use client";

import { useAdminUsers } from "@/hooks/useAdminUsers";
import { UserRole } from "@/types/database";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { UserListTable } from "@/app/components/admin/UserListTable";
import { CreateUserModal } from "@/app/components/admin/CreateUserModal";
import { EditUserModal } from "@/app/components/admin/EditUserModal";
import { ResetPasswordModal } from "@/app/components/admin/ResetPasswordModal";
import { ChangePasswordModal } from "@/app/components/ChangePasswordModal";
import { DeleteUserModal } from "@/app/components/DeleteUserModal";
import { ClinicSettingsTab } from "@/app/components/admin/ClinicSettingsTab";
import { AuditLogTab } from "@/app/components/admin/AuditLogTab";
import { useState, useEffect } from "react";

type SubSection = "profile" | "general" | "checklist" | "assistant" | "treatments" | "channels" | "doctor-hours" | "check-in";
type NavId = "team" | SubSection | "audit" | "enabiz" | "new-branch";

const SETTINGS_SECTIONS: SubSection[] = ["profile", "assistant", "checklist", "general", "doctor-hours", "treatments", "channels", "check-in"];
const isSettingsSection = (id: NavId): id is SubSection => SETTINGS_SECTIONS.includes(id as SubSection);

interface NavItem {
  id: NavId;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  adminOnly?: boolean;
  items: NavItem[];
}

function TeamIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "EKİP",
    items: [
      { id: "team", label: "Ekip Üyeleri", icon: <TeamIcon /> },
    ],
  },
  {
    title: "KLİNİK AYARLARI",
    adminOnly: true,
    items: [
      { id: "profile", label: "Profil & İletişim", icon: "🏢" },
      { id: "assistant", label: "Asistan Mesajları", icon: "🤖" },
      { id: "checklist", label: "Görev Yetkileri", icon: "🛡️" },
      { id: "general", label: "Çalışma Saatleri", icon: "⏰" },
      { id: "doctor-hours", label: "Hekim Profilleri", icon: "👨‍⚕️" },
      { id: "treatments", label: "Tedavi Türleri", icon: "🦷" },
      { id: "channels", label: "Kanallar", icon: "📱" },
      { id: "check-in", label: "QR Giriş", icon: "🔲" },
    ],
  },
  {
    title: "SİSTEM",
    adminOnly: true,
    items: [
      { id: "audit", label: "İşlem Günlüğü", icon: "📋" },
      { id: "enabiz", label: "E-Nabız & USS", icon: "⚕️" },
      { id: "new-branch", label: "Yeni Şube Aç", icon: "➕" },
    ],
  },
];

export default function AdminUsersPage() {
  const clinic = useClinic();
  const { userRole, themeColorFrom: brandFrom = '#4f46e5', themeColorTo: brandTo = '#10b981' } = clinic;
  const {
    users, loading, error, isAdmin, currentUserId,
    showCreateModal, setShowCreateModal, showEditModal, setShowEditModal, selectedUser,
    showPasswordModal, setShowPasswordModal, deleteTarget, setDeleteTarget, deleteProtected,
    showResetModal, setShowResetModal, setResetUserId,
    saving, newEmail, setNewEmail, newFullName, setNewFullName, newPassword, setNewPassword,
    newRole, setNewRole, newInvite, setNewInvite, newIsClinicalProvider, setNewIsClinicalProvider,
    editFullName, setEditFullName, editRole, setEditRole, editIsClinicalProvider, setEditIsClinicalProvider,
    editIsActive, setEditIsActive, editSpecialtyCode, setEditSpecialtyCode, editPhone, setEditPhone,
    editWorkingHours, setEditWorkingHours, editSaving,
    resetPassword, setResetPassword, resetSaving, resetError, resetSuccess, setResetSuccess,
    handleCreateUser, handleUpdateUser, handleResetPassword, executeDeleteUser, openEditModal, openDeleteModal
  } = useAdminUsers();

  const [activeNav, setActiveNav] = useState<NavId>("team");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState(
    encodeURIComponent("Merhaba, sistem üzerinden hesabıma yeni bir şube/klinik eklemek istiyorum. Bilgi alabilir miyim?")
  );

  useEffect(() => {
    if (activeNav !== "new-branch") return;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("users").select("full_name, clinic_id").eq("id", user.id).single();
        if (!profile) return;
        const activeClinicId = localStorage.getItem("activeClinicId") || profile.clinic_id;
        const { data: clinic } = await supabase.from("clinics").select("name").eq("id", activeClinicId).single();
        const text = `Merhaba, ben ${profile.full_name} (${clinic?.name || "Klinik"}). Sistem üzerinden hesabıma yeni bir şube/klinik eklemek istiyorum. Bilgi alabilir miyim?`;
        setWhatsappMessage(encodeURIComponent(text));
      } catch { /* ignore */ }
    })();
  }, [activeNav]);

  const adminCount = users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN).length;
  const doctorCount = users.filter(u => u.role === UserRole.DOKTOR || (u.is_clinical_provider && u.role !== UserRole.DOKTOR)).length;

  const visibleGroups = NAV_GROUPS.filter(g => !g.adminOnly || isAdmin);

  function NavButton({ item, mobile = false }: { item: NavItem; mobile?: boolean }) {
    const active = activeNav === item.id;
    if (mobile) {
      return (
        <button
          onClick={() => setActiveNav(item.id)}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shrink-0 transition-all ${active ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-white"
            }`}
        >
          <span className="text-base leading-none">{typeof item.icon === "string" ? item.icon : item.icon}</span>
          <span className="whitespace-nowrap">{item.label}</span>
        </button>
      );
    }
    return (
      <button
        onClick={() => setActiveNav(item.id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left group ${active
          ? "text-white shadow-md shadow-slate-200/50"
          : "text-slate-500 hover:bg-slate-100"
          }`}
        style={active ? { background: brandFrom } : {}}
      >
        <span className="text-base leading-none transition-all">
          {typeof item.icon === "string" ? item.icon : item.icon}
        </span>
        <span className="truncate" style={!active ? { color: 'inherit' } : {}}>{item.label}</span>
      </button>
    );
  }

  const allNavItems = visibleGroups.flatMap(g => g.items);
  const activeItem = allNavItems.find(i => i.id === activeNav);

  return (
    <div className="flex flex-col gap-0 relative">

      {/* ── Mobile Sticky Header ── */}
      <div className="lg:hidden sticky top-0 z-10 -mx-4 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 px-4 h-14">
          {activeNav !== "team" ? (
            <button
              onClick={() => setActiveNav("team")}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-600 shrink-0 active:scale-95 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          ) : (
            <div className="w-8 h-8 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900 truncate">{activeItem?.label ?? "Ekip Üyeleri"}</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-600 shrink-0 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Sheet Drawer ── */}
      {mobileMenuOpen && visibleGroups.length > 1 && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            <div className="px-4 pb-8 pt-2 space-y-5">
              {visibleGroups.map(group => (
                <div key={group.title}>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] px-2 mb-2">
                    {group.title}
                  </p>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const active = activeNav === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { setActiveNav(item.id); setMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${active
                            ? "text-white shadow-lg"
                            : "text-slate-600 hover:bg-slate-50 active:bg-slate-100"
                            }`}
                          style={active ? { background: brandFrom, boxShadow: `0 10px 15px -3px ${brandFrom}33` } : {}}
                        >
                          <span className="text-lg leading-none">
                            {typeof item.icon === "string" ? item.icon : item.icon}
                          </span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop + Mobile Body ── */}
      <div className="flex gap-6 lg:gap-8 pt-4 lg:pt-0">

        {/* ── Desktop Sidebar ── */}
        {visibleGroups.length > 1 && (
          <aside className="hidden lg:flex flex-col w-52 shrink-0 sticky top-4 self-start max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="space-y-5">
              {visibleGroups.map(group => (
                <div key={group.title}>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] px-3 mb-1.5">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map(item => (
                      <NavButton key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* ── Content Area ── */}
        <div className="flex-1 min-w-0">

          {/* Ekip Üyeleri */}
          {activeNav === "team" && (
            <div className="space-y-5">
              {/* Başlık + istatistikler + eylem */}
              <div className="flex flex-col md:flex-row items-center md:justify-between gap-4">
                <div className="hidden lg:flex flex-col gap-1">
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">Ekip Üyeleri</h1>
                </div>

                <div className="flex flex-row items-center justify-between md:justify-end gap-2 w-full md:w-auto">
                  <div className="flex flex-row items-center gap-2 flex-[3] md:flex-none">
                    <div className="flex flex-1 md:w-16 flex-col items-center justify-center gap-1 bg-white border border-slate-100 rounded-xl px-1 py-1.5 shadow-sm min-w-0 transition-all hover:border-slate-200">
                      <span className="text-sm md:text-base font-black text-slate-900 leading-tight">{users.length}</span>
                      <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter">ÜYE</span>
                    </div>
                    <div className="flex flex-1 md:w-16 flex-col items-center justify-center gap-1 bg-white border border-slate-100 rounded-xl px-1 py-1.5 shadow-sm min-w-0 transition-all hover:border-slate-200">
                      <span className="text-sm md:text-base font-black text-slate-900 leading-tight">{adminCount}</span>
                      <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter">YÖN</span>
                    </div>
                    <div className="flex flex-1 md:w-16 flex-col items-center justify-center gap-1 bg-white border border-slate-100 rounded-xl px-1 py-1.5 shadow-sm min-w-0 transition-all hover:border-slate-200">
                      <span className="text-sm md:text-base font-black text-slate-900 leading-tight">{doctorCount}</span>
                      <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-tighter">HEK</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex flex-[2] md:flex-none md:h-[50px] md:px-5 items-center justify-center gap-2 h-[46px] rounded-xl text-white text-[11px] md:text-xs font-black shadow-lg transition-all active:scale-95"
                      style={{ background: brandFrom, boxShadow: `0 10px 15px -3px ${brandFrom}33` }}
                    >
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span>Yeni Üye</span>
                    </button>
                  )}
                </div>
              </div>

              <UserListTable
                users={users}
                loading={loading}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onEditUser={openEditModal}
              />
            </div>
          )}

          {/* Klinik Ayarları (tüm alt bölümler) */}
          {isSettingsSection(activeNav) && (
            <ClinicSettingsTab section={activeNav} hideTabBar />
          )}

          {/* İşlem Günlüğü */}
          {activeNav === "audit" && (
            <div className="space-y-4">
              <div className="hidden lg:block">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">İşlem Günlüğü</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SİSTEM</p>
              </div>
              <AuditLogTab />
            </div>
          )}

          {/* E-Nabız & USS */}
          {activeNav === "enabiz" && (
            <div className="max-w-lg">
              <div className="hidden lg:block mb-6">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">E-Nabız & USS</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ENTEGRASYON</p>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div 
                    className="h-1.5" 
                    style={{ background: `linear-gradient(to right, ${brandFrom}, ${brandTo})` }}
                />
                <div className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div 
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm"
                        style={{ background: `${brandFrom}15`, color: brandFrom }}
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-black text-slate-900">E-Nabız &amp; USS Entegrasyonu</h2>
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 uppercase tracking-wider">Yakında</span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Sağlık Bakanlığı entegrasyonları</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-8">
                    {[
                      { title: "USS — Ulusal Sağlık Sistemi", desc: "Muayene ve tedavi kayıtlarının otomatik iletimi." },
                      { title: "E-Nabız Entegrasyonu", desc: "Hasta geçmiş verilerini E-Nabız sisteminden görüntüleme." },
                      { title: "e-Reçete & Sevk", desc: "Elektronik reçete yazımı ve diğer kurumlara sevk işlemleri." },
                    ].map(f => (
                      <div key={f.title} className="flex gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{f.title}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6">
                    Bu entegrasyon geliştirme sürecindedir. Aktif olduğunda panel üzerinden doğrudan bağlantı kurabileceksiniz.
                  </p>
                  <a
                    href={`https://wa.me/905000000000?text=${encodeURIComponent("Merhaba, E-Nabız & USS entegrasyonu hakkında bilgi almak istiyorum.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black transition-all active:scale-95 shadow-lg shadow-emerald-100"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                    WhatsApp ile Bilgi Al
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Yeni Şube Aç */}
          {activeNav === "new-branch" && (
            <div className="max-w-lg">
              <div className="hidden lg:block mb-6">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Yeni Şube Aç</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BÜYÜME</p>
              </div>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 mb-2">Kliniğinizi Büyütün</h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Mevcut aboneliğinize yeni bir şube veya klinik eklemek için destek ekibimizle iletişime geçin. Tüm şubelerinizi tek panelden yönetebilirsiniz.
                  </p>
                </div>
                <div className="space-y-2.5">
                  {["Merkezi hasta takibi", "Şubeler arası randevu", "Tek fatura yönetici", "Konsolide raporlama"].map(f => (
                    <div key={f} className="flex items-center gap-2.5">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${brandTo}15` }}
                      >
                        <svg className="w-3 h-3" style={{ color: brandTo }} fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{f}</span>
                    </div>
                  ))}
                </div>
                <a
                  href={`https://wa.me/905000000000?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black transition-all active:scale-95 shadow-lg shadow-emerald-100"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                  WhatsApp ile Başvur
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── Modaller ── */}
        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
          saving={saving}
          error={error}
          email={newEmail}
          setEmail={setNewEmail}
          fullName={newFullName}
          setFullName={setNewFullName}
          password={newPassword}
          setPassword={setNewPassword}
          role={newRole}
          setRole={setNewRole}
          invite={newInvite}
          setInvite={setNewInvite}
          isClinicalProvider={newIsClinicalProvider}
          setIsClinicalProvider={setNewIsClinicalProvider}
          isSuperAdmin={isAdmin}
        />

        <EditUserModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateUser}
          saving={editSaving}
          error={error}
          user={selectedUser}
          fullName={editFullName}
          setFullName={setEditFullName}
          role={editRole}
          setRole={setEditRole}
          isClinicalProvider={editIsClinicalProvider}
          setIsClinicalProvider={setEditIsClinicalProvider}
          isActive={editIsActive}
          setIsActive={setEditIsActive}
          specialtyCode={editSpecialtyCode}
          setSpecialtyCode={setEditSpecialtyCode}
          phone={editPhone}
          setPhone={setEditPhone}
          workingHours={editWorkingHours}
          setWorkingHours={setEditWorkingHours}
          isSuperAdmin={isAdmin}
          currentUserId={currentUserId}
          onResetPassword={() => {
            setResetUserId(selectedUser?.id || null);
            setResetSuccess(false);
            setShowResetModal(true);
          }}
          onDeleteUser={() => selectedUser && openDeleteModal(selectedUser)}
          onChangePassword={() => setShowPasswordModal(true)}
        />

        <ResetPasswordModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }}
          saving={resetSaving}
          error={resetError}
          success={resetSuccess}
          password={resetPassword}
          setPassword={setResetPassword}
        />

        <ChangePasswordModal
          open={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />

        <DeleteUserModal
          open={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={executeDeleteUser}
          userName={deleteTarget?.full_name ?? null}
          userEmail={deleteTarget?.email ?? null}
          isProtected={deleteProtected}
        />
      </div>
    </div>
  );
}
