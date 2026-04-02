"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useClinic, useUI } from "@/app/context/ClinicContext";
import { PatientDetailModal } from "@/app/components/patients/PatientDetailModal";
import { getPatientDetails } from "@/lib/api";
import type { PatientRow, PatientAppointment, PatientPayment } from "@/hooks/usePatients";

interface PatientResult {
    id: string;
    full_name: string;
    phone: string | null;
    birth_date: string | null;
    gender: string | null;
}

interface Props {
    variant?: "light" | "dark";
}

function getAge(birthDate: string | null): string | null {
    if (!birthDate) return null;
    const diff = Date.now() - new Date(birthDate).getTime();
    const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return isNaN(age) || age < 0 ? null : `${age} yaş`;
}

function getInitials(name: string): string {
    return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

const AVATAR_GRADIENTS = [
    "from-teal-500 to-emerald-500",
    "from-indigo-500 to-violet-500",
    "from-rose-500 to-pink-500",
    "from-amber-500 to-orange-400",
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-indigo-500",
    "from-emerald-500 to-green-600",
    "from-sky-500 to-blue-600",
];

function getAvatarGradient(name: string): string {
    let code = 0;
    for (let i = 0; i < Math.min(name.length, 3); i++) code += name.charCodeAt(i);
    return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

export function GlobalPatientSearch({ variant = "light" }: Props) {
    const { clinicId } = useClinic();

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PatientResult[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Patient detail modal state
    const [detailPatient, setDetailPatient] = useState<PatientRow | null>(null);
    const [detailAppointments, setDetailAppointments] = useState<PatientAppointment[]>([]);
    const [detailPayments, setDetailPayments] = useState<PatientPayment[]>([]);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const { setOverlayActive } = useUI();

    const search = useCallback(async (q: string) => {
        if (!clinicId || q.trim().length < 3) { setResults([]); return; }
        setLoading(true);
        const { data } = await supabase
            .from("patients")
            .select("id, full_name, phone, birth_date, gender")
            .eq("clinic_id", clinicId)
            .or(`full_name.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`)
            .order("full_name")
            .limit(8);
        setResults(data ?? []);
        setLoading(false);
    }, [clinicId]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(query), 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, search]);

    useEffect(() => {
        if (open) { 
            setTimeout(() => inputRef.current?.focus(), 50); 
            setQuery(""); 
            setResults([]); 
            setOverlayActive(true, true);
        } else {
            setOverlayActive(false);
        }
    }, [open, setOverlayActive]);

    // Ensure overlay is cleared if component unmounts while search is open
    useEffect(() => {
        return () => {
            setOverlayActive(false);
        };
    }, [setOverlayActive]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const handleSelect = async (result: PatientResult) => {
        setOpen(false);
        setDetailLoading(true);
        setDetailOpen(true);

        // Fetch full patient row
        const { data: patientData } = await supabase
            .from("patients")
            .select("id, full_name, phone, email, birth_date, tc_identity_no, gender, blood_group, address, occupation, allergies, medical_alerts, notes, created_at")
            .eq("id", result.id)
            .single();

        if (patientData) {
            setDetailPatient(patientData as PatientRow);
            const details = await getPatientDetails(result.id);
            setDetailAppointments(details.appointments);
            setDetailPayments(details.payments);
        }
        setDetailLoading(false);
    };

    const handleDetailClose = () => {
        setDetailOpen(false);
        setDetailPatient(null);
        setDetailAppointments([]);
        setDetailPayments([]);
    };

    const triggerClass = variant === "dark"
        ? "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 active:scale-90"
        : "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-xl transition-all duration-300 active:scale-90 hover:bg-white/20";

    const { themeColorFrom } = useClinic();

    return (
        <>
            <button 
                type="button" 
                onClick={() => setOpen(true)} 
                title="Hasta Ara (⌘K)" 
                className={triggerClass}
                style={variant === "dark" ? { color: 'var(--brand-from)', backgroundColor: `${themeColorFrom}15` } : {}}
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
            </button>

            {/* 
              PREMIUM FULL-SCREEN STRATEGY:
              - createPortal: We render this to document.body to escape the parent container's 
                stacking context (filters like scale/grayscale in AppShell break normal z-indexing).
              - z-[300]: Higher than AppShell's Sidebar (z-50) and Header (z-40).
              - backdrop-blur-xl: Deep glassmorphism focus.
            */}
            {/* SEARCH MODAL - HIGH Z-INDEX GLASS DESIGN */}
            {open && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setOpen(false)} />
                    <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden ring-1 ring-black/5 border border-white/40 z-10 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100">
                            <div 
                                className="h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center"
                                style={{ backgroundColor: `${themeColorFrom}15`, color: 'var(--brand-from)' }}
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Hasta adı veya telefon..."
                                className="flex-1 text-base font-medium text-slate-900 placeholder-slate-400 bg-transparent outline-none"
                            />
                            {query && (
                                <button onClick={() => { setQuery(""); setResults([]); }} className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors shrink-0">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                            <div className="h-6 w-[1px] bg-slate-200" />
                            <button
                                onClick={() => setOpen(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-50 text-[11px] font-black text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all uppercase tracking-wider"
                            >
                                Kapat
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto px-2 py-2 custom-scrollbar">
                            {query.trim().length > 0 && query.trim().length < 3 && (
                                <div className="px-4 py-10 flex flex-col items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">En az 3 karakter girin</p>
                                </div>
                            )}
                            {query.trim().length >= 3 && loading && (
                                <div className="px-4 py-12 flex flex-col items-center gap-4">
                                    <div className="h-8 w-8 relative">
                                        <div className="absolute inset-0 rounded-full border-2 border-teal-100" />
                                        <div className="absolute inset-0 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 animate-pulse">Aranıyor...</p>
                                </div>
                            )}
                            {query.trim().length >= 3 && !loading && results.length === 0 && (
                                <div className="px-4 py-12 text-center animate-in fade-in slide-in-from-bottom-2">
                                    <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4 border border-slate-100">
                                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
                                    </div>
                                    <p className="text-sm font-black text-slate-400">Hasta bulunamadı</p>
                                    <p className="text-[11px] text-slate-300 mt-1 uppercase tracking-widest font-bold">Lütfen aramayı güncelleyin</p>
                                </div>
                            )}
                            {results.length > 0 && (
                                <ul className="space-y-1">
                                    {results.map((p, idx) => {
                                        let gradient = getAvatarGradient(p.full_name);
                                        return (
                                        <li key={p.id} className="animate-in fade-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${idx * 40}ms` }}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelect(p)}
                                                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 rounded-2xl transition-all text-left group border border-transparent hover:border-slate-100 hover:shadow-sm"
                                            >
                                                <div className={`h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-[12px] font-black text-white shadow-lg ring-4 ring-white`}>
                                                    {getInitials(p.full_name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-black text-slate-900 group-hover:text-teal-600 transition-colors uppercase tracking-tight">{p.full_name}</p>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        {p.phone && (
                                                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-lg border border-slate-200/50">
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.313c0-.627-.47-1.13-1.077-1.13h-3.414c-.627 0-1.13.47-1.13 1.077v1.313a2.25 2.25 0 0 1-2.25 2.25 15 15 0 0 1-15-15 2.25 2.25 0 0 1 2.25-2.25h1.313c.627 0 1.13-.47 1.13-1.077V2.25c0-.627-.47-1.13-1.077-1.13H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" /></svg>
                                                                {p.phone}
                                                            </span>
                                                        )}
                                                        {getAge(p.birth_date) && <span className="text-[11px] font-bold text-slate-400">· {getAge(p.birth_date)}</span>}
                                                        {p.gender && <span className="text-[11px] font-bold text-slate-400">· {p.gender === "male" ? "Erkek" : p.gender === "female" ? "Kadın" : p.gender}</span>}
                                                    </div>
                                                </div>
                                                <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-teal-50 group-hover:text-teal-600 transition-all">
                                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                                    </svg>
                                                </div>
                                            </button>
                                        </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {!query && (
                                <div className="px-4 py-12 flex flex-col items-center gap-4 animate-in fade-in duration-500">
                                    <div className="relative">
                                        <div 
                                            className="absolute inset-0 blur-xl rounded-full opacity-20" 
                                            style={{ backgroundColor: 'var(--brand-from)' }}
                                        />
                                        <div 
                                            className="relative h-16 w-16 rounded-3xl bg-white border border-slate-100 flex items-center justify-center shadow-sm"
                                            style={{ color: 'var(--brand-from)' }}
                                        >
                                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                                        </div>
                                    </div>
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Hastalarınızda Arama Yapın</p>
                                    <p className="text-[11px] text-slate-300 font-bold max-w-[200px] leading-relaxed">Ad veya telefon numarası girerek hızlıca sonuçlara ulaşın</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Loading overlay for patient detail fetch */}
            {detailLoading && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-xl">
                    <div className="bg-white rounded-2xl px-6 py-4 shadow-xl text-sm text-slate-600 flex items-center gap-3">
                        <svg className="h-4 w-4 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Hasta bilgileri yükleniyor...
                    </div>
                </div>
            )}

            {/* Inline patient detail modal */}
            <PatientDetailModal
                isOpen={detailOpen && !detailLoading}
                onClose={handleDetailClose}
                patient={detailPatient}
                appointments={detailAppointments}
                payments={detailPayments}
                onDelete={async () => false}
                onUpdate={async () => false}
            />
        </>
    );
}
