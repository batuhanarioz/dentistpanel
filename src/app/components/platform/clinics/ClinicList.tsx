import React, { useState, useMemo } from "react";
import type { Clinic } from "@/types/database";

interface ClinicListProps {
    clinics: Clinic[];
    loading: boolean;
    onEditClinic: (clinic: Clinic) => void;
    onViewClinic: (clinic: Clinic) => void;
}

export function ClinicList({ clinics, loading, onEditClinic, onViewClinic }: ClinicListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 25;

    // Filtering logic
    const filteredClinics = useMemo(() => {
        return clinics.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.slug.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [clinics, searchQuery]);

    // Pagination logic
    const totalPages = Math.ceil(filteredClinics.length / pageSize);
    const paginatedClinics = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredClinics.slice(start, start + pageSize);
    }, [filteredClinics, currentPage]);

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    return (
        <section className="rounded-3xl border bg-white shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
            <div className="bg-white border-b px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Klinik Kayıtları</h2>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Yönetim ve Takip Paneli</p>
                    </div>

                    <div className="relative w-full md:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Klinik adı, e-posta veya slug ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border-slate-200 rounded-2xl text-xs font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-slate-100 border-t-teal-500 rounded-full animate-spin" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Veriler Yükleniyor...</p>
                        </div>
                    </div>
                ) : paginatedClinics.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 mx-auto mb-4 text-slate-300">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        </div>
                        <p className="text-sm font-black text-slate-900">Sonuç Bulunamadı</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">Arama kriterlerinize uygun klinik kaydı bulunmuyor.</p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="mt-4 text-[10px] font-black text-teal-600 uppercase tracking-widest hover:text-teal-700"
                            >
                                Aramayı Temizle
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedClinics.map((c, index) => (
                            <div
                                key={c.id}
                                className={`group p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col gap-4 ${c.is_active
                                    ? "bg-white border-slate-100 hover:border-teal-200 hover:shadow-2xl hover:shadow-teal-100/40"
                                    : "bg-slate-50/50 border-slate-200 opacity-60"
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-sm font-black text-white shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
                                        {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${c.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-600"
                                            }`}>
                                            {c.is_active ? "AKTİF" : "PASİF"}
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border italic ${c.subscription_status === 'trialing' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            c.subscription_status === 'active' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                                            }`}>
                                            {c.subscription_status === 'trialing' ? 'DENEME' :
                                                c.subscription_status === 'active' ? 'ABONE' : 'SORUNLU'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-sm font-black text-slate-900 line-clamp-1">{c.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">/{c.slug}</p>

                                    <div className="mt-4 space-y-2">
                                        {c.email && (
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                <span className="truncate">{c.email}</span>
                                            </div>
                                        )}
                                        {c.phone && (
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                <span>{c.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-3">
                                    <div className="flex flex-col flex-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kayıt Tarihi</span>
                                        <span className="text-[10px] font-bold text-slate-700">{new Date(c.created_at).toLocaleDateString("tr-TR")}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onViewClinic(c)}
                                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-teal-600 hover:text-white transition-all shadow-sm"
                                            title="Detayları Görüntüle"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onEditClinic(c)}
                                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                            title="Bilgileri Düzenle"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="bg-slate-50/50 border-t px-6 py-4 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {filteredClinics.length} kayıttan {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredClinics.length)} arası gösteriliyor
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-600 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-400 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`h-8 w-8 rounded-xl text-[10px] font-black tracking-widest transition-all ${currentPage === i + 1
                                    ? "bg-black text-white shadow-lg shadow-slate-200"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                {i + 1}
                            </button>
                        )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-teal-600 hover:border-teal-600 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-400 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
