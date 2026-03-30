"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, LogOut, Search, Activity } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface AccessibleClinic {
  id: string;
  name: string;
  slug: string;
}

export default function SelectClinicPage() {
  const router = useRouter();
  const [clinics, setClinics] = useState<AccessibleClinic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const storedClinics = localStorage.getItem("userAccessibleClinics");
    if (storedClinics) {
      try {
        const parsedClinics = JSON.parse(storedClinics);
        setClinics(parsedClinics);
      } catch (e) {
        setError("Klinik bilgileri alınamadı.");
      }
    } else {
      setError("Erişilebilir klinik bulunamadı. Lütfen tekrar giriş yapın.");
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "invalid_clinic") {
      setError("Seçilen klinik geçersiz veya artık erişiminiz yok. Lütfen başka bir klinik seçin.");
    }
  }, []);

  const handleClinicSelect = (clinic: AccessibleClinic) => {
    setSelectedId(clinic.id);
    localStorage.setItem("activeClinicId", clinic.id);
    // Küçük bir gecikme ile yönlendirme efekti
    setTimeout(() => {
      router.push(`/${clinic.slug}`);
    }, 400);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    localStorage.clear();
    router.replace("/login");
  };

  const filteredClinics = useMemo(() => {
    if (!searchQuery.trim()) return clinics;
    return clinics.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [clinics, searchQuery]);

  // Premium initials logic
  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Arka plan süslemeleri */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-400/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg z-10 relative">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-6 relative">
            <Building2 className="text-white w-8 h-8" strokeWidth={1.5} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Çalışma Alanınızı Seçin</h1>
          <p className="text-slate-500 text-sm font-medium">Lütfen işlem yapmak istediğiniz kliniği seçerek devam edin.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-100 p-4 flex items-start gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2">
            <div className="bg-white rounded-full p-1 mt-0.5 shadow-sm">
              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-slate-200/60 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          
          {/* Arama Çubuğu */}
          {clinics.length > 5 && (
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Listede klinik ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm font-medium rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 block w-full pl-11 p-3.5 transition-all outline-none"
              />
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar">
            {clinics.length > 0 ? (
              filteredClinics.length > 0 ? (
                filteredClinics.map((clinic, idx) => {
                  const isSelecting = selectedId === clinic.id;
                  const delay = idx * 50;
                  return (
                    <button
                      key={clinic.id}
                      onClick={() => !selectedId && handleClinicSelect(clinic)}
                      disabled={selectedId !== null}
                      style={{ animationDelay: `${delay}ms` }}
                      className={`w-full group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 fill-mode-both 
                        ${isSelecting 
                            ? "bg-teal-50 border-teal-200 scale-[0.98] opacity-100" 
                            : selectedId !== null 
                              ? "opacity-40 grayscale pointer-events-none" 
                              : "bg-white border-slate-100 hover:border-teal-200 hover:shadow-[0_8px_30px_-12px_rgba(20,184,166,0.2)] hover:-translate-y-0.5"}`}
                    >
                      <div className="flex items-center gap-4 relative z-10 w-full">
                        <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 
                          ${isSelecting 
                              ? "bg-teal-600 text-white shadow-md shadow-teal-500/30" 
                              : "bg-slate-100/80 text-slate-600 group-hover:bg-teal-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-teal-500/20"}`}>
                          {getInitials(clinic.name)}
                        </div>
                        
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <span className={`font-bold text-[15px] truncate w-full text-left transition-colors duration-300
                            ${isSelecting ? "text-teal-900" : "text-slate-800 group-hover:text-teal-700"}`}
                          >
                            {clinic.name}
                          </span>
                          <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
                            {clinic.slug}
                          </span>
                        </div>
                        
                        <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300
                          ${isSelecting 
                              ? "bg-teal-600 text-white shadow-md" 
                              : "bg-slate-50 text-slate-300 group-hover:bg-teal-50 group-hover:text-teal-600"}`}>
                          {isSelecting ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isSelecting ? "" : "group-hover:translate-x-1"}`} />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-500 font-medium">
                  "{searchQuery}" aramasına uygun klinik bulunamadı.
                </div>
              )
            ) : (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
                 <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
                 <span className="text-sm font-semibold">{error ? "" : "Klinikler yükleniyor..."}</span>
              </div>
            )}
          </div>
        </div>

        {/* Oturumu Kapat Butonu */}
        <div className="mt-8 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut || selectedId !== null}
            className="group flex items-center justify-center gap-2.5 rounded-2xl bg-white px-6 py-3.5 text-xs font-bold text-slate-600 border border-slate-200/60 shadow-sm hover:shadow-md hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoggingOut ? (
              <svg className="h-4 w-4 animate-spin text-rose-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            )}
            <span className="uppercase tracking-widest">{isLoggingOut ? "Çıkış Yapılıyor..." : "Güvenli Çıkış Yap"}</span>
          </button>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
