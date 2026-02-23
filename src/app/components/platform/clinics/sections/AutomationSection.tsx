import React from "react";
import { SYSTEM_AUTOMATIONS, ClinicAutomation } from "@/constants/automations";

interface AutomationSectionProps {
    formAutomations: ClinicAutomation[];
    setFormAutomations: React.Dispatch<React.SetStateAction<ClinicAutomation[]>>;
}

export function AutomationSection({
    formAutomations,
    setFormAutomations,
}: AutomationSectionProps) {

    // Ensure all system automations exist in the form state
    React.useEffect(() => {
        const missing = SYSTEM_AUTOMATIONS.filter(sys => !formAutomations.some(f => f.id === sys.id));
        if (missing.length > 0) {
            setFormAutomations(prev => [
                ...prev,
                ...missing.map(m => ({
                    id: m.id,
                    name: m.name,
                    visible: false,
                    enabled: false,
                    time: "09:00"
                }))
            ]);
        }
    }, [formAutomations, setFormAutomations]);

    const updateAutomation = (id: string, field: keyof ClinicAutomation, value: any) => {
        setFormAutomations(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    return (
        <div className="space-y-4 pt-4 border-t border-slate-100 italic-none">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Sistem Otomasyonları</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Klinik bazlı otomasyon yetkisi, durumu ve zamanlaması.</p>
                </div>
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
            </div>

            <div className="space-y-2.5">
                {SYSTEM_AUTOMATIONS.map((sys) => {
                    const config = formAutomations.find(a => a.id === sys.id) || {
                        id: sys.id,
                        name: sys.name,
                        visible: false,
                        enabled: false,
                        time: "09:00"
                    };

                    return (
                        <div
                            key={sys.id}
                            className="p-3 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h5 className="text-[11px] font-bold text-slate-800 leading-tight">{sys.name}</h5>
                                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{sys.description}</p>
                                </div>
                                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter ${sys.category === 'WhatsApp' ? 'bg-emerald-100 text-emerald-700' :
                                    sys.category === 'SMS' ? 'bg-amber-100 text-amber-700' :
                                        sys.category === 'AI' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {sys.category}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 pt-2 border-t border-slate-50">
                                {/* Görünürlük */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Klinikte Görünsün</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={config.visible}
                                            onChange={(e) => updateAutomation(sys.id, "visible", e.target.checked)}
                                        />
                                        <div className="w-8 h-4.5 bg-slate-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                {/* Aktiflik */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Çalışma Durumu</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={config.enabled}
                                            onChange={(e) => updateAutomation(sys.id, "enabled", e.target.checked)}
                                        />
                                        <div className="w-8 h-4.5 bg-slate-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>

                                {/* Zamanlama */}
                                {sys.category !== 'AI' && (
                                    <div className="flex flex-col gap-1 flex-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight text-right">Zamanlama</span>
                                        <div className="flex items-center gap-2 justify-end">
                                            {sys.id === 'gmail_performance_weekly' && (
                                                <select
                                                    value={config.day || "Monday"}
                                                    onChange={(e) => updateAutomation(sys.id, "day", e.target.value)}
                                                    className="text-[11px] font-bold text-slate-700 bg-slate-50 border-none rounded-lg p-1 focus:ring-0"
                                                >
                                                    <option value="Monday">Pazartesi</option>
                                                    <option value="Tuesday">Salı</option>
                                                    <option value="Wednesday">Çarşamba</option>
                                                    <option value="Thursday">Perşembe</option>
                                                    <option value="Friday">Cuma</option>
                                                    <option value="Saturday">Cumartesi</option>
                                                    <option value="Sunday">Pazar</option>
                                                </select>
                                            )}
                                            <input
                                                type="time"
                                                value={config.time}
                                                onChange={(e) => updateAutomation(sys.id, "time", e.target.value)}
                                                className="text-[11px] font-bold text-slate-700 bg-slate-50 border-none rounded-lg p-1 text-right focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
