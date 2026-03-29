"use client";

/**
 * LabAlertBanner — Yarın randevusu olup lab işi hâlâ teslim alınmamış hastaları gösterir.
 * Dashboard'da StatCards'ın üstüne yerleştirilir.
 */

import { useLabAlerts } from "@/hooks/useLabJobs";
import { useParams } from "next/navigation";

export function LabAlertBanner() {
    const { data: alerts = [], isLoading } = useLabAlerts();
    const params = useParams();
    const slug = params?.slug as string | undefined;

    if (isLoading || alerts.length === 0) return null;

    return (
        <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 overflow-hidden">
            {/* Kırmızı başlık şeridi */}
            <div className="bg-rose-500 px-4 py-2.5 flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                </span>
                <p className="text-white font-black text-sm uppercase tracking-widest">
                    ⚠️ Protez Gelmedi Alarmı — {alerts.length} işlem
                </p>
            </div>

            {/* Uyarı listesi */}
            <div className="divide-y divide-rose-200">
                {alerts.map(job => (
                    <div key={job.id} className="flex items-center justify-between px-4 py-3 gap-4">
                        <div>
                            <p className="font-black text-rose-900 text-sm">
                                {job.patients?.full_name ?? "Hasta"}
                            </p>
                            <p className="text-[11px] font-semibold text-rose-700 mt-0.5">
                                {job.job_type}
                                {job.shade ? ` · ${job.shade}` : ""}
                                {" · "}🏭 {job.lab_name}
                                {" · "}Beklenen: {new Date(job.expected_at + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                            </p>
                        </div>
                        {slug && (
                            <a
                                href={`/${slug}/lab-management`}
                                className="shrink-0 text-[10px] font-black uppercase tracking-widest text-rose-700 border border-rose-300 bg-white px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors"
                            >
                                Lab&apos;a Git →
                            </a>
                        )}
                    </div>
                ))}
            </div>

            <div className="px-4 py-2 bg-rose-100 border-t border-rose-200">
                <p className="text-[10px] font-semibold text-rose-600">
                    Bu hastaların yarın randevusu var. Lab işlerini teslim almadan önce randevuyu kontrol edin.
                </p>
            </div>
        </div>
    );
}
