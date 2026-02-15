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

  // Calculate statistics
  const adminCount = users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN).length;
  const doctorCount = users.filter(u => u.role === UserRole.DOKTOR).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Info Cards Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
          <div className="rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-sm shadow-emerald-100">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Toplam Ekip</p>
                <p className="text-lg font-black text-slate-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm shadow-indigo-100">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Yönetici</p>
                <p className="text-lg font-black text-indigo-700">{adminCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-sm shadow-blue-100">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Doktor</p>
                <p className="text-lg font-black text-blue-700">{doctorCount}</p>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-100 hover:from-emerald-700 hover:to-teal-600 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Yeni Üye Ekle
            </button>
            <button
              onClick={() => setShowChecklistModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white px-4 py-2.5 text-xs font-bold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-sm"
            >
              Dashboard Görev Ayarları
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
    </div>
  );
}
