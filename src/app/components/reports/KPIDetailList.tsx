import React from "react";
import { AppointmentRow } from "@/hooks/useReports";

interface KPIDetailListProps {
    data: AppointmentRow[];
    patientNames: Record<string, string>;
    doctors: Array<{ id: string; full_name: string }>;
    title: string;
    onClose: () => void;
    onItemClick: (date: string) => void;
    isUnpaid?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
    pending: "Onay Bekliyor",
    confirmed: "Onaylı",
    completed: "Tamamlandı",
    cancelled: "İptal",
    no_show: "Gelmedi",
};

export function KPIDetailList({
    data, patientNames, doctors, title, onClose, onItemClick, isUnpaid
}: KPIDetailListProps) {
    return (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b px-5 py-3 flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-semibold text-slate-900">{title}</h3>
                    <p className="text-[10px] text-slate-400">{data.length} kayıt bulundu</p>
                </div>
                <button type="button" onClick={onClose} className="rounded-lg border p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="px-5 py-4 space-y-2 max-h-[300px] overflow-y-auto">
                {data.map((a) => {
                    const d = new Date(a.starts_at);
                    const doctorName = doctors.find((doc) => doc.id === a.doctor_id)?.full_name || "Atanmamış";
                    const patient = a.patient_id ? patientNames[a.patient_id] || "..." : "-";
                    const initials = patient.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                        <button
                            key={a.id}
                            type="button"
                            className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 hover:shadow-sm transition-all group"
                            onClick={() => onItemClick(a.starts_at.slice(0, 10))}
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">{initials}</div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-900 truncate">{patient}</p>
                                <p className="text-[10px] text-slate-400 truncate">{a.treatment_type || "Muayene"} · {doctorName}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${a.status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                                    a.status === 'cancelled' || a.status === 'no_show' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                                        'border-slate-200 bg-slate-50 text-slate-600'
                                    }`}>
                                    {STATUS_LABELS[a.status] || a.status}
                                </span>
                                <span className="text-[10px] text-slate-400">{d.toLocaleDateString("tr-TR")} {d.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}</span>
                                <svg className="h-4 w-4 text-slate-300 group-hover:text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                </svg>
                            </div>
                        </button>
                    );
                })}
            </div>
            {isUnpaid && (
                <div className="border-t px-5 py-3 bg-amber-50/50">
                    <p className="text-[11px] text-amber-700 flex items-center gap-1.5 font-medium">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                        Randevuya tıklayarak takvimde açabilir ve ödeme kaydı girebilirsiniz.
                    </p>
                </div>
            )}
        </div>
    );
}
