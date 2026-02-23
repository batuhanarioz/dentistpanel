"use client";

import { useAdminUsers } from "@/hooks/useAdminUsers";
import { UserRole } from "@/types/database";
import { UserListTable } from "@/app/components/admin/UserListTable";
import { CreateUserModal } from "@/app/components/admin/CreateUserModal";
import { EditUserModal } from "@/app/components/admin/EditUserModal";
import { ResetPasswordModal } from "@/app/components/admin/ResetPasswordModal";
import { ChangePasswordModal } from "@/app/components/ChangePasswordModal";
import { DeleteUserModal } from "@/app/components/DeleteUserModal";
import { DashboardChecklistModal } from "@/app/components/DashboardChecklistModal";
import { WorkingHoursModal } from "@/app/components/admin/WorkingHoursModal";
import { useState } from "react";

export default function AdminUsersPage() {
  const {
    users, loading, error, isAdmin, currentUserId,
    showCreateModal, setShowCreateModal, showEditModal, setShowEditModal, selectedUser,
    showPasswordModal, setShowPasswordModal, deleteTarget, setDeleteTarget, deleteProtected,
    showResetModal, setShowResetModal, setResetUserId, showChecklistModal, setShowChecklistModal,
    saving, newEmail, setNewEmail, newFullName, setNewFullName, newPassword, setNewPassword, newRole, setNewRole,
    editFullName, setEditFullName, editRole, setEditRole, editSaving,
    resetPassword, setResetPassword, resetSaving, resetError, resetSuccess, setResetSuccess,
    handleCreateUser, handleUpdateUser, handleResetPassword, executeDeleteUser, openEditModal, openDeleteModal
  } = useAdminUsers();

  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);

  // Calculate statistics
  const adminCount = users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN).length;
  const doctorCount = users.filter(u => u.role === UserRole.DOKTOR).length;

  return (
    <div className="space-y-6 pb-20">
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
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Doktor</p>
                <p className="text-sm sm:text-base font-black text-slate-900 leading-none">{doctorCount}</p>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Settings Group */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:bg-white sm:border sm:border-slate-200 sm:rounded-2xl sm:p-1 sm:shadow-sm">
              <button
                onClick={() => setShowWorkingHoursModal(true)}
                className="flex flex-1 items-center justify-center gap-2 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-slate-200 sm:border-none text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition-all group shadow-sm sm:shadow-none"
                title="Çalışma Saatleri"
              >
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 sm:bg-transparent group-hover:bg-indigo-100 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">Çalışma Saatleri</span>
              </button>
              <div className="hidden sm:block w-px h-6 bg-slate-100 mx-1" />
              <button
                onClick={() => setShowChecklistModal(true)}
                className="flex flex-1 items-center justify-center gap-2 px-3 py-3 sm:py-2.5 rounded-xl bg-white border border-slate-200 sm:border-none text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition-all group shadow-sm sm:shadow-none"
                title="Görev Ayarları"
              >
                <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600 sm:bg-transparent group-hover:bg-violet-100 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">Görev Ayarları</span>
              </button>
            </div>

            {/* Primary Action */}
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

      <DashboardChecklistModal
        open={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
      />

      <WorkingHoursModal
        isOpen={showWorkingHoursModal}
        onClose={() => setShowWorkingHoursModal(false)}
      />
    </div>
  );
}
