"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface Clinic {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  primary_clinic: Clinic | null;
  additional_clinics: string[];
  last_sign_in_at: string | null;
}

export default function PlatformUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Arama Durumları
  const [userSearch, setUserSearch] = useState("");
  const [clinicSearch, setClinicSearch] = useState("");

  // Arama Filtreleri
  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredClinics = clinics.filter((c) =>
    c.name.toLowerCase().includes(clinicSearch.toLowerCase())
  );

  // Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      const res = await fetch("/api/platform/users", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Veriler alınırken bir hata oluştu");
      }

      setUsers(data.users || []);
      setClinics(data.clinics || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user: User) => {
    setSelectedUser(user);
    setSelectedClinicIds([...user.additional_clinics]); // Halihazırda var olan klinikleri seçili yap
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setSelectedClinicIds([]);
    setClinicSearch(""); // Modal kapanınca aramayı temizle
  };

  const handleToggleClinic = (clinicId: string) => {
    setSelectedClinicIds((prev) =>
      prev.includes(clinicId)
        ? prev.filter((id) => id !== clinicId) // Zaten varsa çıkar
        : [...prev, clinicId] // Yoksa ekle
    );
  };

  const handleSaveClinics = async () => {
    if (!selectedUser) return;

    try {
      setIsSaving(true);
      const token = await getAccessToken();
      const res = await fetch(`/api/users/${selectedUser.id}/update-clinics`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ additional_clinics: selectedClinicIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Yetkiler güncellenirken hata oluştu");
      }

      // Başarılı ise arayüzü sadece lokal olarak hızlıca güncelle
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === selectedUser.id ? { ...u, additional_clinics: selectedClinicIds } : u
        )
      );

      closeModal();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <p className="text-xl font-semibold">Erişim Reddedildi</p>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Platform Kullanıcıları
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tüm kliniklerdeki personelleri görüntüleyin ve ek klinik erişimi (Çoklu Klinik) yetkilerini yönetin.
          </p>
        </div>
        
        {/* Kullanıcı Arama Çubuğu */}
        <div className="w-full sm:w-72">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="İsim veya e-posta ara..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="block w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Kullanıcı (Ad / E-posta)</th>
                <th className="px-6 py-4 font-semibold">Rolü</th>
                <th className="px-6 py-4 font-semibold">Ana Kliniği</th>
                <th className="px-6 py-4 font-semibold">Ek Yetkili Klinik Sayısı</th>
                <th className="px-6 py-4 text-right font-semibold">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {user.full_name}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                        {user.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {user.primary_clinic ? user.primary_clinic.name : "Klinik Yok (Platform)"}
                  </td>
                  <td className="px-6 py-4">
                    {user.additional_clinics.length > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        +{user.additional_clinics.length} Klinik
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openModal(user)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900 transition-all"
                    >
                      Klinik Yetkileri
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    {userSearch ? "Aramaya uygun kullanıcı bulunamadı." : "Sistemde henüz kullanıcı bulunmuyor."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL / POPUP EKRANI */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-950 border border-gray-100 dark:border-gray-800">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Çoklu Klinik Yetkilendirme
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                <strong className="text-gray-900 dark:text-gray-200">{selectedUser.full_name}</strong> adlı kullanıcının erişebileceği ek klinikleri seçin.
              </p>

              <div className="mt-4 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Klinik ara..."
                  value={clinicSearch}
                  onChange={(e) => setClinicSearch(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400 transition-colors"
                />
              </div>

              <div className="mt-4 max-h-64 overflow-y-auto pr-2 space-y-2">
                {filteredClinics.map((clinic) => {
                  const isPrimary = selectedUser.primary_clinic?.id === clinic.id;
                  const isChecked = selectedClinicIds.includes(clinic.id);

                  if (isPrimary) return null; // Kendi ana kliniğini listede seçtirmeye gerek yok

                  return (
                    <label
                      key={clinic.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all hover:bg-gray-50 dark:hover:bg-gray-900/50 ${
                        isChecked 
                          ? "border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-500/10" 
                          : "border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <span className={`font-medium ${isChecked ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {clinic.name}
                      </span>
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={isChecked}
                          onChange={() => handleToggleClinic(clinic.id)}
                        />
                        <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-indigo-800"></div>
                      </div>
                    </label>
                  );
                })}
                {filteredClinics.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-6">
                    {clinicSearch ? "Aramaya uygun klinik bulunamadı." : "Bu sisteme ekli başka bir klinik bulunmuyor."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 bg-gray-50 px-6 py-4 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                İptal Et
              </button>
              <button
                type="button"
                onClick={handleSaveClinics}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? "Kaydediliyor..." : "Yetkileri Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
