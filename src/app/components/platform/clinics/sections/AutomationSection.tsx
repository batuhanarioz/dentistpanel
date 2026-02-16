import React from "react";

interface AutomationSectionProps {
    n8nSearch: string;
    setN8nSearch: (val: string) => void;
    n8nWorkflows: { id: string, name: string, active: boolean }[];
    formN8nWorkflows: { id: string, name: string, enabled: boolean }[];
    setFormN8nWorkflows: React.Dispatch<React.SetStateAction<{ id: string, name: string, enabled: boolean }[]>>;
    showEditModal: boolean;
    toggleAutomation: (enabled: boolean, workflowId: string) => Promise<void>;
}

export function AutomationSection({
    n8nSearch,
    setN8nSearch,
    n8nWorkflows,
    formN8nWorkflows,
    setFormN8nWorkflows,
    showEditModal,
    toggleAutomation,
}: AutomationSectionProps) {
    const searchResults = n8nSearch.trim().length >= 3
        ? n8nWorkflows.filter(wf =>
            wf.name.toLowerCase().includes(n8nSearch.toLowerCase()) ||
            wf.id.toLowerCase().includes(n8nSearch.toLowerCase())
        ).filter(wf => !formN8nWorkflows.some(existing => existing.id === wf.id))
        : [];

    return (
        <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider">Otomasyonlar (n8n)</h4>

            {/* Arama Barı */}
            <div className="space-y-1.5">
                <div className="relative">
                    <input
                        type="text"
                        autoComplete="off"
                        placeholder="Workflow ara (en az 3 harf)..."
                        value={n8nSearch}
                        onChange={(e) => setN8nSearch(e.target.value)}
                        className="w-full rounded-lg border px-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                    <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Arama Sonuçları (Inline) */}
                {n8nSearch.trim().length >= 3 && (
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-50 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        {searchResults.length === 0 ? (
                            <div className="px-3 py-2 text-[11px] text-slate-500 italic text-center">Eşleşen sonuç bulunamadı.</div>
                        ) : (
                            searchResults.map(wf => (
                                <div key={wf.id} className="flex items-center justify-between p-2 hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col min-w-0 pr-2">
                                        <span className="text-[11px] font-medium text-slate-800 truncate">{wf.name}</span>
                                        <span className="text-[9px] text-slate-400">ID: {wf.id}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormN8nWorkflows(prev => [...prev, { id: wf.id, name: wf.name, enabled: false }]);
                                            setN8nSearch("");
                                        }}
                                        className="text-[10px] font-bold text-teal-600 hover:text-teal-700 px-3 py-1.5 bg-teal-50 rounded-lg transition-colors border border-teal-100"
                                    >
                                        EKLE
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Kayıtlı Workflow Listesi */}
            <div className="space-y-2">
                {formN8nWorkflows.length === 0 ? (
                    <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-xl">
                        <p className="text-[10px] text-slate-400 italic">Henüz bir otomasyon eklenmedi.</p>
                    </div>
                ) : (
                    formN8nWorkflows.map((wf) => (
                        <div
                            key={wf.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white shadow-sm"
                        >
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-[11px] font-bold text-slate-800 truncate">{wf.name}</span>
                                <span className="text-[9px] text-slate-400 tabular-nums">ID: {wf.id}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {/* Aktif/Pasif Switch */}
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-medium ${wf.enabled ? 'text-teal-600' : 'text-slate-400'}`}>
                                        {wf.enabled ? 'AKTİF' : 'PASİF'}
                                    </span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={wf.enabled}
                                            onChange={(e) => {
                                                const val = e.target.checked;
                                                if (showEditModal) {
                                                    toggleAutomation(val, wf.id);
                                                } else {
                                                    setFormN8nWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, enabled: val } : w));
                                                }
                                            }}
                                        />
                                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>

                                {/* Kaldır Butonu */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (wf.enabled && showEditModal) {
                                            toggleAutomation(false, wf.id);
                                        }
                                        setFormN8nWorkflows(prev => prev.filter(w => w.id !== wf.id));
                                    }}
                                    className="p-1.5 hover:bg-rose-50 rounded-lg group transition-colors"
                                >
                                    <svg className="h-3.5 w-3.5 text-slate-300 group-hover:text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}
