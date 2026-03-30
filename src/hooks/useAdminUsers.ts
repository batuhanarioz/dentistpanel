import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";

export type WorkingHourDay = {
    enabled: boolean;
    start: string;
    end: string;
};

export type WorkingHours = {
    monday: WorkingHourDay;
    tuesday: WorkingHourDay;
    wednesday: WorkingHourDay;
    thursday: WorkingHourDay;
    friday: WorkingHourDay;
    saturday: WorkingHourDay;
    sunday: WorkingHourDay;
};

export type UserRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
    created_at: string;
    is_active: boolean;
    is_clinical_provider: boolean;
    specialty_code: string | null;
    working_hours: WorkingHours | null;
    last_sign_in_at: string | null;
};

export type ClinicRow = {
    id: string;
    name: string;
};

const DEFAULT_WORKING_HOURS: WorkingHours = {
    monday:    { enabled: true,  start: "09:00", end: "18:00" },
    tuesday:   { enabled: true,  start: "09:00", end: "18:00" },
    wednesday: { enabled: true,  start: "09:00", end: "18:00" },
    thursday:  { enabled: true,  start: "09:00", end: "18:00" },
    friday:    { enabled: true,  start: "09:00", end: "18:00" },
    saturday:  { enabled: false, start: "09:00", end: "13:00" },
    sunday:    { enabled: false, start: "09:00", end: "13:00" },
};

export { DEFAULT_WORKING_HOURS };

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

    // Create form states
    const [saving, setSaving] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newFullName, setNewFullName] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState<string>(UserRole.SEKRETER);
    const [newClinicId, setNewClinicId] = useState("");
    const [newInvite, setNewInvite] = useState(false);
    const [newIsClinicalProvider, setNewIsClinicalProvider] = useState(false);

    // Edit form states
    const [editFullName, setEditFullName] = useState("");
    const [editRole, setEditRole] = useState<string>(UserRole.SEKRETER);
    const [editIsActive, setEditIsActive] = useState(true);
    const [editIsClinicalProvider, setEditIsClinicalProvider] = useState(false);
    const [editSpecialtyCode, setEditSpecialtyCode] = useState<string>("");
    const [editWorkingHours, setEditWorkingHours] = useState<WorkingHours | null>(null);
    const [editSaving, setEditSaving] = useState(false);

    // Reset password states
    const [resetPassword, setResetPassword] = useState("");
    const [resetSaving, setResetSaving] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState(false);

    // Self-update states
    const [selfNewEmail, setSelfNewEmail] = useState("");
    const [selfOldPassword, setSelfOldPassword] = useState("");
    const [selfNewPassword, setSelfNewPassword] = useState("");
    const [selfNewPasswordRepeat, setSelfNewPasswordRepeat] = useState("");
    const [selfSaving, setSelfSaving] = useState(false);
    const [selfMessage, setSelfMessage] = useState<string | null>(null);

    const getAccessToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    };

    const refreshUsers = useCallback(async () => {
        if (!clinic.clinicId) return;
        setLoading(true);
        const token = await getAccessToken();
        const res = await fetch("/api/admin/users", {
            headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else setUsers(data.users || []);
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

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const token = await getAccessToken();
        if (!token) { setError("Oturum bulunamadı."); setSaving(false); return; }

        const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({
                email: newEmail,
                fullName: newFullName,
                password: newInvite ? undefined : newPassword,
                role: newRole,
                clinicId: newClinicId || clinic.clinicId,
                invite: newInvite,
                isClinicalProvider: newRole === UserRole.DOKTOR ? true : newIsClinicalProvider,
            })
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else {
            setShowCreateModal(false);
            setNewEmail(""); setNewFullName(""); setNewPassword(""); setNewInvite(false); setNewIsClinicalProvider(false);
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
            body: JSON.stringify({
                id: selectedUser.id,
                fullName: editFullName,
                role: editRole,
                isActive: editIsActive,
                isClinicalProvider: editRole === UserRole.DOKTOR ? true : editIsClinicalProvider,
                specialtyCode: editSpecialtyCode || null,
                workingHours: editWorkingHours,
            })
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
        const res = await fetch("/api/admin/users/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ id: resetUserId, password: resetPassword })
        });
        const data = await res.json();
        if (data.error) setResetError(data.error);
        else setResetSuccess(true);
        setResetSaving(false);
    };

    const executeDeleteUser = async () => {
        if (!deleteTarget) return;
        const token = await getAccessToken();
        const res = await fetch("/api/admin/users", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ id: deleteTarget.id }),
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
        setEditIsActive(user.is_active);
        setEditIsClinicalProvider(user.is_clinical_provider || false);
        setEditSpecialtyCode(user.specialty_code || "");
        setEditWorkingHours(user.working_hours);
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
        saving, newEmail, setNewEmail, newFullName, setNewFullName, newPassword, setNewPassword,
        newRole, setNewRole, newClinicId, setNewClinicId, newInvite, setNewInvite, newIsClinicalProvider, setNewIsClinicalProvider,
        editFullName, setEditFullName, editRole, setEditRole, editIsActive, setEditIsActive, editIsClinicalProvider, setEditIsClinicalProvider,
        editSpecialtyCode, setEditSpecialtyCode, editWorkingHours, setEditWorkingHours, editSaving,
        resetPassword, setResetPassword, resetSaving, resetError, resetSuccess, setResetSuccess,
        selfNewEmail, setSelfNewEmail, selfOldPassword, setSelfOldPassword, selfNewPassword, setSelfNewPassword,
        selfNewPasswordRepeat, setSelfNewPasswordRepeat, selfSaving, selfMessage,
        handleCreateUser, handleUpdateUser, handleResetPassword, executeDeleteUser, handleUpdateSelf,
        openEditModal, openDeleteModal,
    };
}
