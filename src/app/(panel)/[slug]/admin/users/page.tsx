"use client";

import { useAdminUsers } from "@/hooks/useAdminUsers";
import { UserRole } from "@/types/database";
import { supabase } from "@/lib/supabaseClient";
import { UserListTable } from "@/app/components/admin/UserListTable";
import { CreateUserModal } from "@/app/components/admin/CreateUserModal";
import { EditUserModal } from "@/app/components/admin/EditUserModal";
import { ResetPasswordModal } from "@/app/components/admin/ResetPasswordModal";
import { ChangePasswordModal } from "@/app/components/ChangePasswordModal";
import { DeleteUserModal } from "@/app/components/DeleteUserModal";
import { ClinicSettingsTab } from "@/app/components/admin/ClinicSettingsTab";
import { AuditLogTab } from "@/app/components/admin/AuditLogTab";
import { useState, useEffect } from "react";

export default function AdminUsersPage() {
  const {
    users, loading, error, isAdmin, currentUserId,
    showCreateModal, setShowCreateModal, showEditModal, setShowEditModal, selectedUser,
    showPasswordModal, setShowPasswordModal, deleteTarget, setDeleteTarget, deleteProtected,
    showResetModal, setShowResetModal, setResetUserId,
    saving, newEmail, setNewEmail, newFullName, setNewFullName, newPassword, setNewPassword,
    newRole, setNewRole, newInvite, setNewInvite, newIsClinicalProvider, setNewIsClinicalProvider,
    editFullName, setEditFullName, editRole, setEditRole, editIsClinicalProvider, setEditIsClinicalProvider,
    editIsActive, setEditIsActive, editSpecialtyCode, setEditSpecialtyCode,
    editWorkingHours, setEditWorkingHours, editSaving,
    resetPassword, setResetPassword, resetSaving, resetError, resetSuccess, setResetSuccess,
    handleCreateUser, handleUpdateUser, handleResetPassword, executeDeleteUser, openEditModal, openDeleteModal
  } = useAdminUsers();

  const [activeTab, setActiveTab] = useState<"members" | "settings" | "audit" | "enabiz">("members");
  const [showEnabizModal, setShowEnabizModal] = useState(false);
  const [showNewClinicModal, setShowNewClinicModal] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("Merhaba,%20panelim%20üzerinden%20hesabıma%20yeni%20bir%20şube%2Fklinik%20eklemek%20istiyorum.%20Neler%20yapabiliriz%3F");

  // Load user information for the WhatsApp message
  useEffect(() => {
    async function loadWhatsappInfo() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from("users").select("full_name, clinic_id").eq("id", user.id).single();
        if (!profile) return;

        const activeClinicId = localStorage.getItem("activeClinicId") || profile.clinic_id;
        const { data: clinic } = await supabase.from("clinics").select("name").eq("id", activeClinicId).single();

        const text = `Merhaba, ben ${profile.full_name} (${clinic?.name || "Klinik"}). Sistem üzerinden hesabıma yeni bir şube/klinik eklemek istiyorum. Bilgi alabilir miyim?`;
        setWhatsappMessage(encodeURIComponent(text));
      } catch (e) {
        console.error("WhatsApp info error", e);
      }
    }
    if (showNewClinicModal) {
      loadWhatsappInfo();
    }
  }, [showNewClinicModal]);

  // Calculate statistics
  const adminCount = users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN).length;
  const doctorCount = users.filter(u => u.role === UserRole.DOKTOR).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Tab Navigation */}
      <div className="flex bg-slate-100/50 p-1 rounded-2xl w-fit border border-slate-200/50">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === "members"
            ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60"
            : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            }`}
        >
          Ekip Üyeleri
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === "settings"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                }`}
            >
              Klinik Ayarları
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === "audit"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                }`}
            >
              İşlem Günlüğü
            </button>
            <button
              onClick={() => setShowEnabizModal(true)}
              className="px-6 py-2.5 rounded-xl text-xs font-black transition-all text-slate-500 hover:text-slate-700 hover:bg-white/50 flex items-center gap-1.5"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-[9px] font-black leading-none">!</span>
              E-Nabız &amp; USS
            </button>
            <div className="w-px h-6 bg-slate-200/60 self-center mx-1" />
            <button
              onClick={() => setShowNewClinicModal(true)}
              className="px-6 py-2.5 rounded-xl text-xs font-black transition-all text-indigo-600 bg-indigo-50 border border-indigo-100/50 hover:bg-indigo-100 hover:text-indigo-700 flex items-center gap-2 group shadow-sm hover:shadow-indigo-100/50"
            >
              <svg className="h-4 w-4 text-indigo-500 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Yeni Şube Aç
            </button>
          </>
        )}
      </div>

      {activeTab === "members" ? (
        <>
          {/* Header & Actions Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
              <div className="rounded-2xl border bg-white p-2.5 sm:p-4 shadow-sm transition-all hover:border-slate-300">
                <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-1.5 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-slate-50 text-slate-600 border border-slate-100 shrink-0">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Ekip</p>
                    <p className="text-sm sm:text-base font-black text-slate-900 leading-none">{users.length}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-2.5 sm:p-4 shadow-sm transition-all hover:border-slate-300">
                <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-1.5 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Yönetici</p>
                    <p className="text-sm sm:text-base font-black text-slate-900 leading-none">{adminCount}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-2.5 sm:p-4 shadow-sm transition-all hover:border-slate-300">
                <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-1.5 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Hekim</p>
                    <p className="text-sm sm:text-base font-black text-slate-900 leading-none">{doctorCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="h-[52px] px-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-100/50 hover:shadow-teal-200/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group"
                >
                  <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <span className="text-sm font-black tracking-tight whitespace-nowrap">Yeni Üye Ekle</span>
                </button>
              </div>
            )}
          </div>

          <section className="rounded-3xl border bg-white shadow-sm overflow-hidden">
            <UserListTable
              users={users}
              loading={loading}
              isAdmin={isAdmin}
              onEditUser={openEditModal}
            />
          </section>
        </>
      ) : activeTab === "settings" ? (
        <ClinicSettingsTab />
      ) : (
        <AuditLogTab />
      )}

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

      {/* E-Nabız & USS Bilgi Modalı */}
      {showEnabizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
            {/* Dekoratif üst şerit */}
            <div className="h-1.5 bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400" />

            <div className="p-8">
              {/* Başlık */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-teal-100 text-blue-600">
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

              {/* Açıklama */}
              <div className="space-y-4 mb-7">
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
                  <h3 className="text-sm font-black text-blue-800 mb-1.5">E-Nabız Nedir?</h3>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Sağlık Bakanlığı&apos;nın kişisel sağlık platformudur. Entegrasyon sayesinde hasta tedavi geçmişi, reçete ve tetkik bilgilerini doğrudan kliniğiniz üzerinden görüntüleyebilir; yapılan işlemleri otomatik olarak e-Nabız&apos;a bildirebilirsiniz.
                  </p>
                </div>
                <div className="rounded-2xl bg-teal-50 border border-teal-100 p-4">
                  <h3 className="text-sm font-black text-teal-800 mb-1.5">USS (Ulusal Sağlık Sistemi) Nedir?</h3>
                  <p className="text-xs text-teal-700 leading-relaxed">
                    Sağlık Bakanlığı&apos;na bağlı tüm kliniklerin tanı, tedavi ve ödeme verilerini merkezi sisteme aktardığı platformdur. USS entegrasyonu; SGK bildirimleri, hizmet kodları ve fatura onaylarını panel üzerinden tek adımda gerçekleştirmenizi sağlayacaktır.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-start gap-3">
                  <svg className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Bu entegrasyonlar şu an geliştirme aşamasında olup önümüzdeki güncellemede kullanıma açılacaktır. Hazır olduğunda klinik yöneticileri bildirim alacaktır.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowEnabizModal(false)}
                className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 transition-colors"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Yeni Şube / Klinik Aç Modeli */}
      {showNewClinicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Banner */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 text-center relative overflow-hidden">
              <div className="absolute top-[-20%] left-[-10%] w-[150px] h-[150px] rounded-full bg-white/10 blur-[30px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[150px] h-[150px] rounded-full bg-indigo-400/20 blur-[30px]" />

              <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-5 shadow-xl">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight mb-2">Yeni Bir Şube mi Açıyorsunuz?</h3>
              <p className="text-indigo-100 text-sm font-medium opacity-90 leading-relaxed">Yeni kliniğinizi tebrik ederiz! Süreci hızlıca tamamlayalım.</p>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50 text-amber-900 border border-amber-100/60">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black mb-1.5 uppercase tracking-wide">Güvenlik ve Kurumsal İşlem</h4>
                    <p className="text-sm font-medium text-amber-800/80 leading-relaxed">
                      Aynı hesap altında birden fazla klinik ve şube yönetimi <b>Gelişmiş Kurumsal Plana</b> dahildir. KVKK standartları ve veri izolasyonu gereği, ikinci bir şubenin entegrasyon işlemi uzman satış & destek ekibimiz tarafından dakikalar içinde gerçekleştirilmektedir.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => setShowNewClinicModal(false)}
                  className="w-full sm:w-1/3 px-6 py-3.5 rounded-2xl bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-100 hover:text-slate-800 transition-colors"
                >
                  Vazgeç
                </button>
                <a
                  href={`https://wa.me/905444412180?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-2/3 px-6 py-3.5 rounded-2xl bg-[#25D366] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 hover:bg-[#20bd5a] hover:shadow-xl hover:shadow-[#25D366]/30 transition-all active:scale-95"
                >
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 1.928 6.556L.516 23.32a.667.667 0 0 0 .809.831l4.98-1.385A11.972 11.972 0 0 0 12 24a12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zM12 22.08a10.05 10.05 0 0 1-5.06-1.37l-.546-.353-3.084.858.74-2.887-.333-.513A10.083 10.083 0 1 1 12 22.08zm5.558-7.514c-.29-.144-1.745-.859-2.015-.957-.27-.099-.467-.144-.664.144-.197.288-.756.958-.925 1.155-.17.197-.339.222-.629.078-2.046-1.02-3.111-2.22-4.322-4.22-.17-.282.164-.265.733-1.386.084-.167.042-.315-.03-.456-.073-.146-.665-1.603-.91-2.195-.24-.576-.484-.499-.664-.508-.17-.008-.367-.01-.564-.01a1.082 1.082 0 0 0-.786.368c-.27.288-1.031 1.008-1.031 2.457s1.056 2.85 1.203 3.047c.147.197 2.052 3.235 5.034 4.453.71.291 1.264.464 1.693.593.713.216 1.363.185 1.879.112.576-.081 1.745-.713 1.991-1.401.246-.688.246-1.278.172-1.402-.073-.124-.27-.198-.56-.342z" /></svg>
                  WhatsApp Destek Hattı
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
