"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
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
        if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(""); setResults([]); }
    }, [open]);

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
        : "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-all duration-300 active:scale-90 hover:bg-white/20";

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} title="Hasta Ara (⌘K)" className={triggerClass}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
            </button>

            {/* Search modal */}
            {open && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 z-10">
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                            <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ad veya telefon ile hasta arayın..."
                                className="flex-1 text-sm text-slate-900 placeholder-slate-400 bg-transparent outline-none"
                            />
                            {query && (
                                <button onClick={() => { setQuery(""); setResults([]); }} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0" title="Temizle">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="ml-1 shrink-0 h-7 px-2.5 flex items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors tracking-wide"
                            >
                                Kapat
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto">
                            {query.trim().length > 0 && query.trim().length < 3 && (
                                <div className="px-4 py-6 text-center text-xs text-slate-400">En az 3 karakter girin</div>
                            )}
                            {query.trim().length >= 3 && loading && (
                                <div className="px-4 py-6 text-center text-xs text-slate-400 animate-pulse">Aranıyor...</div>
                            )}
                            {query.trim().length >= 3 && !loading && results.length === 0 && (
                                <div className="px-4 py-8 text-center">
                                    <svg className="h-8 w-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                                    </svg>
                                    <p className="text-xs text-slate-400">Kayıtlı hasta bulunamadı</p>
                                </div>
                            )}
                            {results.length > 0 && (
                                <ul className="py-2">
                                    {results.map((p, idx) => {
                                        let gradient = getAvatarGradient(p.full_name);
                                        if (idx > 0) {
                                            const prevGradient = getAvatarGradient(results[idx - 1].full_name);
                                            if (gradient === prevGradient) {
                                                const gi = AVATAR_GRADIENTS.indexOf(gradient);
                                                gradient = AVATAR_GRADIENTS[(gi + 1) % AVATAR_GRADIENTS.length];
                                            }
                                        }
                                        return (
                                        <li key={p.id}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelect(p)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left group"
                                            >
                                                <div className={`h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-[11px] font-bold text-white shadow-sm`}>
                                                    {getInitials(p.full_name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">{p.full_name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {p.phone && <span className="text-[11px] text-slate-500">{p.phone}</span>}
                                                        {getAge(p.birth_date) && <span className="text-[11px] text-slate-400">· {getAge(p.birth_date)}</span>}
                                                        {p.gender && <span className="text-[11px] text-slate-400">· {p.gender === "male" ? "Erkek" : p.gender === "female" ? "Kadın" : p.gender}</span>}
                                                    </div>
                                                </div>
                                                <svg className="h-4 w-4 text-slate-300 group-hover:text-teal-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                                </svg>
                                            </button>
                                        </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {!query && (
                                <div className="px-4 py-6 text-center text-xs text-slate-400">Ad veya telefon numarası ile arayın</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Loading overlay for patient detail fetch */}
            {detailLoading && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-sm">
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
