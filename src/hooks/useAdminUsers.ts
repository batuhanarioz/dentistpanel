import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";

export type UserRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
    created_at: string;
};

export type ClinicRow = {
    id: string;
    name: string;
};

export const DOCTOR_LIMITS: Record<string, number> = {
    starter: 1,
    pro: 5,
    enterprise: 999,
};

export function useAdminUsers() {
    const clinic = useClinic();
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
    const [clinics, setClinics] = useState<ClinicRow[]>([]);

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
    const [deleteProtected, setDeleteProtected] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetUserId, setResetUserId] = useState<string | null>(null);
    const [showChecklistModal, setShowChecklistModal] = useState(false);

    // Form states
    const [saving, setSaving] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newFullName, setNewFullName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState<string>(UserRole.SEKRETER);
    const [newClinicId, setNewClinicId] = useState("");

    const [editFullName, setEditFullName] = useState("");
    const [editRole, setEditRole] = useState<string>(UserRole.SEKRETER);
    const [editSaving, setEditSaving] = useState(false);

    const [resetPassword, setResetPassword] = useState("");
    const [resetSaving, setResetSaving] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState(false);

    const [selfNewEmail, setSelfNewEmail] = useState("");
    const [selfOldPassword, setSelfOldPassword] = useState("");
    const [selfNewPassword, setSelfNewPassword] = useState("");
    const [selfNewPasswordRepeat, setSelfNewPasswordRepeat] = useState("");
    const [selfSaving, setSelfSaving] = useState(false);
    const [selfMessage, setSelfMessage] = useState<string | null>(null);

    const refreshUsers = useCallback(async () => {
        if (!clinic.clinicId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("users")
            .select("id, full_name, email, role, created_at")
            .eq("clinic_id", clinic.clinicId)
            .neq("role", UserRole.SUPER_ADMIN)
            .order("created_at", { ascending: true });
        if (error) setError(error.message);
        else setUsers(data || []);
        setLoading(false);
    }, [clinic.clinicId]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setError("Oturum bulunamadı."); setLoading(false); return; }
            const { data: current } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
            if (!current) { setError("Kullanıcı profili bulunamadı."); setLoading(false); return; }

            const isCurrentAdmin = current.role === UserRole.ADMIN || current.role === UserRole.SUPER_ADMIN;
            setIsAdmin(isCurrentAdmin);
            setCurrentUserId(user.id);
            setCurrentUserEmail(user.email ?? "");
            setSelfNewEmail(user.email ?? "");

            await refreshUsers();

            if (current.role === UserRole.SUPER_ADMIN) {
                const { data: clinicData } = await supabase.from("clinics").select("id, name").eq("is_active", true).order("name", { ascending: true });
                setClinics(clinicData || []);
            }
        };
        init();
    }, [refreshUsers]);

    const getAccessToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const token = await getAccessToken();
        if (!token) { setError("Oturum bulunamadı."); setSaving(false); return; }

        if (newRole === UserRole.DOKTOR) {
            const currentDocs = users.filter(u => u.role === UserRole.DOKTOR).length;
            const limit = DOCTOR_LIMITS[clinic.planId || "starter"] || 1;
            if (currentDocs >= limit) {
                setError(`Limit aşıldı. En fazla ${limit} doktor ekleyebilirsiniz.`);
                setSaving(false);
                return;
            }
        }

        const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ email: newEmail, fullName: newFullName, password: newPassword, role: newRole, clinicId: newClinicId || clinic.clinicId })
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else {
            setShowCreateModal(false);
            setNewEmail(""); setNewFullName(""); setNewPassword("");
            await refreshUsers();
        }
        setSaving(false);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setEditSaving(true);
        setError(null);
        const token = await getAccessToken();
        const res = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ userId: selectedUser.id, fullName: editFullName, role: editRole })
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else { setShowEditModal(false); setSelectedUser(null); await refreshUsers(); }
        setEditSaving(false);
    };

    const handleResetPassword = async () => {
        if (!resetUserId) return;
        setResetSaving(true);
        setResetError(null);
        const token = await getAccessToken();
        const res = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ userId: resetUserId, password: resetPassword })
        });
        const data = await res.json();
        if (data.error) setResetError(data.error);
        else setResetSuccess(true);
        setResetSaving(false);
    };

    const executeDeleteUser = async () => {
        if (!deleteTarget) return;
        const token = await getAccessToken();
        const res = await fetch(`/api/admin/users?userId=${deleteTarget.id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.error) alert(data.error);
        else { setDeleteTarget(null); await refreshUsers(); }
    };

    const handleUpdateSelf = async (e: React.FormEvent) => {
        e.preventDefault();
        setSelfSaving(true);
        setSelfMessage(null);
        setError(null);

        if (selfNewPassword && selfNewPassword !== selfNewPasswordRepeat) {
            setError("Şifreler eşleşmiyor.");
            setSelfSaving(false); return;
        }

        if (selfNewEmail !== currentUserEmail) {
            const { error: eError } = await supabase.auth.updateUser({ email: selfNewEmail });
            if (eError) { setError(eError.message); setSelfSaving(false); return; }
        }

        if (selfNewPassword) {
            const { error: pError } = await supabase.auth.updateUser({ password: selfNewPassword });
            if (pError) { setError(pError.message); setSelfSaving(false); return; }
        }

        setSelfMessage("Profil başarıyla güncellendi.");
        setSelfSaving(false);
        setSelfNewPassword(""); setSelfNewPasswordRepeat("");
    };

    const openEditModal = (user: UserRow) => {
        setSelectedUser(user);
        setEditFullName(user.full_name || "");
        setEditRole(user.role);
        setShowEditModal(true);
    };

    const openDeleteModal = (user: UserRow) => {
        setDeleteTarget(user);
        setDeleteProtected(user.role === UserRole.ADMIN);
    };

    return {
        users, loading, error, isAdmin, currentUserId, currentUserEmail, clinics,
        showCreateModal, setShowCreateModal, showEditModal, setShowEditModal, selectedUser, setSelectedUser,
        showPasswordModal, setShowPasswordModal, deleteTarget, setDeleteTarget, deleteProtected,
        showResetModal, setShowResetModal, resetUserId, setResetUserId, showChecklistModal, setShowChecklistModal,
        saving, newEmail, setNewEmail, newFullName, setNewFullName, newPassword, setNewPassword, newRole, setNewRole, newClinicId, setNewClinicId,
        editFullName, setEditFullName, editRole, setEditRole, editSaving,
        resetPassword, setResetPassword, resetSaving, resetError, resetSuccess, setResetSuccess,
        selfNewEmail, setSelfNewEmail, selfOldPassword, setSelfOldPassword, selfNewPassword, setSelfNewPassword, selfNewPasswordRepeat, setSelfNewPasswordRepeat, selfSaving, selfMessage,
        handleCreateUser, handleUpdateUser, handleResetPassword, executeDeleteUser, handleUpdateSelf, openEditModal, openDeleteModal
    };
}
