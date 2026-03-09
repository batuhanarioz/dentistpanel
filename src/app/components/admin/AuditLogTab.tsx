import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useState } from "react";

export function AuditLogTab() {
    const { logs, loading, error, filters, updateFilters, loadMore, hasMore } = useAuditLogs();
    const { users } = useAdminUsers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const getActionColor = (action: string) => {
        switch (action) {
            case "INSERT": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "UPDATE": return "bg-blue-100 text-blue-700 border-blue-200";
            case "DELETE": return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    const getEntityLabel = (entity: string) => {
        switch (entity) {
            case "appointments": return "Randevu";
            case "payments": return "Ödeme";
            case "patients": return "Hasta";
            default: return entity;
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case "INSERT": return "Yeni Kayıt";
            case "UPDATE": return "Güncelleme";
            case "DELETE": return "Silme İşlemi";
            default: return action;
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportToCSV = (specificLog?: any) => {
        const dataToExport = specificLog ? [specificLog] : logs;
        if (dataToExport.length === 0) return;

        const headers = ["Tarih", "Personel", "İşlem", "Kapsam", "IP Adresi", "Entity ID", "Eski Veri", "Yeni Veri"];
        const rows = dataToExport.map(log => [
            format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
            log.user?.full_name || "Sistem / Otomasyon",
            getActionLabel(log.action),
            getEntityLabel(log.entity_type),
            log.ip_address || "-",
            log.entity_id,
            log.old_data ? JSON.stringify(log.old_data) : "-",
            log.new_data ? JSON.stringify(log.new_data) : "-"
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        const fileName = specificLog
            ? `islem_${specificLog.id.slice(0, 8)}_${format(new Date(), "yyyyMMdd")}.csv`
            : `islem_gunlugu_${format(new Date(), "yyyyMMdd")}.csv`;

        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (error) return <div className="p-8 text-center text-red-500 font-bold">Hata: {error}</div>;

    return (
        <div className="space-y-6">
            {/* Filtreleme ve Export Paneli */}
            <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                    {/* Personel Filtresi */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">İşlemi Yapan</label>
                        <select
                            value={filters.userId || ""}
                            onChange={(e) => updateFilters({ userId: e.target.value || null })}
                            className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Tüm Personeller</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tarih Filtresi */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Zaman Aralığı</label>
                        <select
                            value={filters.dateRange}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onChange={(e) => updateFilters({ dateRange: e.target.value as any })}
                            className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                        >
                            <option value="today">Bugün</option>
                            <option value="7d">Son 7 Gün</option>
                            <option value="30d">Son 30 Gün</option>
                            <option value="all">Tüm Zamanlar</option>
                        </select>
                    </div>

                    {/* Kapsam Filtresi */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">İşlem Kapsamı</label>
                        <select
                            value={filters.entityType}
                            onChange={(e) => updateFilters({ entityType: e.target.value })}
                            className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">Tümü</option>
                            <option value="appointments">Randevular</option>
                            <option value="payments">Ödemeler</option>
                            <option value="patients">Hastalar</option>
                        </select>
                    </div>
                </div>

                {/* CSV Export Butonu */}
                <button
                    onClick={() => exportToCSV()}
                    disabled={logs.length === 0}
                    className="h-11 px-6 rounded-2xl bg-slate-900 text-white text-xs font-black flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    TOPLU CSV
                </button>
            </div>

            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden min-h-[400px]">
                {loading && logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-xs font-bold text-slate-400">Veriler getiriliyor...</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tarih</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Personel</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">İşlem</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Kapsam</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Eylem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                                            {format(new Date(log.created_at), "d MMMM HH:mm", { locale: tr })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900 leading-none">{log.user?.full_name || "Sistem / Otomasyon"}</span>
                                                <span className="text-[10px] text-slate-400 mt-1">{log.user?.email || "-"}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black border ${getActionColor(log.action)}`}>
                                                {getActionLabel(log.action)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-semibold text-slate-600">
                                                {getEntityLabel(log.entity_type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => exportToCSV(log)}
                                                    title="CSV İndir"
                                                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    title="Detay Göster"
                                                    className="p-2 rounded-xl hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="p-4 bg-slate-50 rounded-full mb-3">
                                                    <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-bold text-slate-400">Seçilen kriterlere uygun işlem kaydı bulunamadı.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {hasMore && (
                            <div className="p-4 border-t border-slate-50 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                                >
                                    {loading ? "Yükleniyor..." : "Daha Fazla Yükle"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Detay Modalı */}
            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-200">
                        <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-black text-slate-900">İşlem Detayları</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">İşlem ID: #{selectedLog.id.slice(0, 8)}</p>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white rounded-xl transition-all">
                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Eski Durum</p>
                                    <pre className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">
                                        {selectedLog.old_data ? JSON.stringify(selectedLog.old_data, null, 2) : "DÜZENLEME ÖNCESİ VERİ YOK"}
                                    </pre>
                                </div>
                                <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
                                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-2 tracking-widest">Yeni Durum</p>
                                    <pre className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {selectedLog.new_data ? JSON.stringify(selectedLog.new_data, null, 2) : "VERİ SİLİNDİ"}
                                    </pre>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="px-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">IP Adresi</p>
                                    <p className="text-xs font-bold text-slate-700">{selectedLog.ip_address || "Bilinmiyor"}</p>
                                </div>
                                <div className="px-1">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Cihaz</p>
                                    <p className="text-xs font-bold text-slate-700 truncate" title={selectedLog.user_agent}>{selectedLog.user_agent ? "Tanımlı Cihaz" : "Bilinmiyor"}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50/50 border-t flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
