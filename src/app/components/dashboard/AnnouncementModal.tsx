"use client";

import { Announcement } from "@/types/database";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface AnnouncementModalProps {
    announcement: Announcement;
    onClose: () => void;
    onMarkAsRead: () => void;
}

export function AnnouncementModal({ announcement, onClose, onMarkAsRead }: AnnouncementModalProps) {
    const handleMarkAsReadAndClose = () => {
        onMarkAsRead();
        onClose();
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'danger': return { icon: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', label: 'KRİTİK' };
            case 'warning': return { icon: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', label: 'UYARI' };
            case 'success': return { icon: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'BAŞARI' };
            default: return { icon: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', label: 'BİLGİ' };
        }
    };

    const styles = getTypeStyles(announcement.type);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div
                className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`p-6 ${styles.bg} border-b ${styles.border} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm ${styles.icon}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.062.51.11.77.143l3.61 2.888a.75.75 0 0 0 1.25-.561V5.722a.75.75 0 0 0-1.25-.561l-3.61 2.888a24.42 24.42 0 0 1-.77.143m0 9.18V8.752" />
                            </svg>
                        </div>
                        <div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${styles.icon}`}>
                                {styles.label} DUYURUSU
                            </span>
                            <h3 className="text-sm font-black text-slate-900 leading-tight truncate max-w-[280px]">
                                {announcement.title}
                            </h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8">
                    <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap text-sm">
                        {announcement.content}
                    </p>

                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Yayın Tarihi</span>
                            <span className="text-xs font-bold text-slate-600">
                                {format(new Date(announcement.created_at), 'd MMMM yyyy, HH:mm', { locale: tr })}
                            </span>
                        </div>
                        <button
                            onClick={handleMarkAsReadAndClose}
                            className="px-6 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200"
                        >
                            Okudum, Anladım
                        </button>
                    </div>
                </div>
            </div>

            {/* Background click to close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
}
