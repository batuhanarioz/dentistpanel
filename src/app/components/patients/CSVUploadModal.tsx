"use client";

import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { v4 as uuidv4 } from "uuid";

interface CSVUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: () => void;
}

export function CSVUploadModal({ isOpen, onClose, onUploadComplete }: CSVUploadModalProps) {
    const { clinicId } = useClinic();
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({
        full_name: "",
        phone: "",
        email: "",
        birth_date: "",
        tc_identity_no: "",
        notes: "",
        allergies: "",
        medical_alerts: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const normalizePhone = (phone: string | null) => {
        if (!phone) return null;
        let cleaned = phone.replace(/\D/g, "");
        if (!cleaned) return null;

        // If it starts with 0 (e.g. 0532...), remove the 0
        if (cleaned.startsWith("0")) {
            cleaned = cleaned.substring(1);
        }

        // If it's 10 digits (e.g. 532...), prepend +90
        if (cleaned.length === 10) {
            return `+90${cleaned}`;
        }

        // If it starts with 90 and is 12 digits (e.g. 90532...), prepend +
        if (cleaned.startsWith("90") && cleaned.length === 12) {
            return `+${cleaned}`;
        }

        // Return as is if already correctly formatted or unknown
        return phone.startsWith("+") ? phone : `+${cleaned}`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split("\n");
                const firstLine = lines[0];
                const detectedHeaders = firstLine.split(/[;,]/).map(h => h.trim().replace(/^"|"$/g, ""));
                setHeaders(detectedHeaders);

                // Try to auto-map
                const newMapping = { ...mapping };
                detectedHeaders.forEach(h => {
                    const lowH = h.toLowerCase();
                    if (lowH.includes("ad") || lowH.includes("name") || lowH.includes("hasta")) newMapping.full_name = h;
                    if (lowH.includes("tel") || lowH.includes("phone") || lowH.includes("gsm")) newMapping.phone = h;
                    if (lowH.includes("mail") || lowH.includes("email")) newMapping.email = h;
                    if (lowH.includes("doğum") || lowH.includes("birth")) newMapping.birth_date = h;
                    if (lowH.includes("tc") || lowH.includes("kimlik")) newMapping.tc_identity_no = h;
                    if (lowH.includes("not") || lowH.includes("description")) newMapping.notes = h;
                    if (lowH.includes("aleri") || lowH.includes("allergy")) newMapping.allergies = h;
                    if (lowH.includes("tıbbi") || lowH.includes("alert") || lowH.includes("uyarı")) newMapping.medical_alerts = h;
                });
                setMapping(newMapping);
            };
            reader.readAsText(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file || !mapping.full_name || !mapping.phone) {
            setError("Lütfen dosyayı seçin ve zorunlu alanları (Ad Soyad, Telefon) eşleştirin.");
            return;
        }

        if (!clinicId) {
            setError("Klinik bilgisi bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const text = await file.text();
            // Intelligent split: handle quotes and separators
            const lines = text.split("\n").filter(line => line.trim());
            const dataRows = lines.slice(1);

            const patientsToInsert = dataRows.map(line => {
                // Better parsing for CSV with potential commas in quotes
                const values: string[] = [];
                let current = "";
                let inQuotes = false;
                const sep = text.includes(";") ? ";" : ",";

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') inQuotes = !inQuotes;
                    else if (char === sep && !inQuotes) {
                        values.push(current.trim());
                        current = "";
                    } else current += char;
                }
                values.push(current.trim());

                const patient: any = {
                    id: uuidv4(),
                    clinic_id: clinicId,
                };

                Object.entries(mapping).forEach(([dbField, csvHeader]) => {
                    if (csvHeader) {
                        const index = headers.indexOf(csvHeader);
                        if (index !== -1) {
                            let val = values[index]?.replace(/^"|"$/g, "") || null;
                            if (dbField === "phone" && val) {
                                val = normalizePhone(val);
                            }
                            patient[dbField] = val;
                        }
                    }
                });

                return patient;
            }).filter(p => p.full_name && p.phone);

            if (patientsToInsert.length === 0) {
                setError("Yüklenecek geçerli hasta kaydı bulunamadı.");
                setLoading(false);
                return;
            }

            const { error: insertError } = await supabase
                .from("patients")
                .insert(patientsToInsert);

            if (insertError) throw insertError;

            onUploadComplete();
            onClose();
        } catch (err: any) {
            setError(err.message || "Yükleme sırasında bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { label: "Ad Soyad *", key: "full_name" },
        { label: "Telefon *", key: "phone" },
        { label: "E-posta", key: "email" },
        { label: "Doğum Tarihi", key: "birth_date" },
        { label: "TC Kimlik No", key: "tc_identity_no" },
        { label: "Notlar", key: "notes" },
        { label: "Alerjiler", key: "allergies" },
        { label: "Tıbbi Uyarılar", key: "medical_alerts" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl border w-full max-w-lg mx-auto overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">CSV'den Hasta Yükle</h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {!file ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-teal-100 rounded-2xl p-10 text-center cursor-pointer hover:bg-teal-50 transition-colors"
                        >
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            <div className="flex justify-center mb-3 text-teal-600">
                                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                            </div>
                            <p className="text-sm font-bold text-slate-700">CSV Dosyasını Seçin</p>
                            <p className="text-xs text-slate-500 mt-1">Sürükle bırak veya tıklayarak yükle</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50/50 p-3">
                                <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                                <button onClick={() => { setFile(null); setHeaders([]); }} className="ml-auto text-xs font-bold text-rose-600 hover:text-rose-700">Değiştir</button>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Alan Eşleştirme</p>
                                <div className="grid gap-3 border rounded-2xl p-4 bg-slate-50/50 max-h-[40vh] overflow-y-auto">
                                    {fields.map((field) => (
                                        <div key={field.key} className="flex items-center justify-between gap-4">
                                            <label className="text-xs font-bold text-slate-600 shrink-0">{field.label}</label>
                                            <select
                                                value={mapping[field.key]}
                                                onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                                className="w-full max-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                            >
                                                <option value="">Eşleştirilmedi</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700 font-medium">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            hidden={!file}
                            disabled={loading}
                            onClick={handleUpload}
                            className="w-full rounded-xl bg-teal-600 py-3 text-xs font-bold text-white hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? "Yükleniyor..." : "Yüklemeyi Başlat"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
