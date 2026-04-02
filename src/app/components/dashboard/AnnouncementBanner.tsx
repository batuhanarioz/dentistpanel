"use client";

import { useAnnouncements } from "@/hooks/useAnnouncements";
import { Announcement } from "@/types/database";
import { useState, useEffect } from "react";
import { AnnouncementModal } from "./AnnouncementModal";

export function AnnouncementBanner() {
    const { announcements, markAsRead } = useAnnouncements();
    const [currentAnn, setCurrentAnn] = useState<Announcement | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Only show danger or warning announcements in the banner
    const criticalAnnouncements = announcements.filter(a => a.type === 'danger' || a.type === 'warning');

    useEffect(() => {
        if (criticalAnnouncements.length > 0) {
            setCurrentAnn(criticalAnnouncements[0]);
        } else {
            setCurrentAnn(null);
        }
    }, [criticalAnnouncements]);

    if (!currentAnn) return null;

    const bgClass = currentAnn.type === 'danger'
        ? "bg-rose-600 shadow-rose-200"
        : "bg-amber-500 shadow-amber-100";

    return (
        <>
            <div className={`relative z-[70] w-full ${bgClass} px-4 py-2.5 shadow-lg animate-in slide-in-from-top duration-500`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div
                        className="flex items-center gap-3 overflow-hidden cursor-pointer group/text"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 backdrop-blur-xl group-hover/text:bg-white/30 transition-colors">
                            {currentAnn.type === 'danger' ? (
                                <svg className="w-4 h-4 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-x-3 gap-y-0.5 overflow-hidden">
                            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] opacity-80 shrink-0">
                                {currentAnn.type === 'danger' ? 'Kritik Duyuru' : 'Sistem Uyarısı'}
                            </span>
                            <p className="text-xs font-bold text-white truncate max-w-[200px] md:max-w-md lg:max-w-2xl group-hover/text:underline decoration-white/40 underline-offset-4">
                                {currentAnn.title}: <span className="font-medium opacity-90">{currentAnn.content}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(currentAnn.id); }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 group"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Kapat</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Animasyonlu alt çizgi efekti */}
                <div className="absolute bottom-0 left-0 h-[2px] bg-white/30 w-full overflow-hidden">
                    <div className="h-full bg-white/60 animate-progress origin-left" />
                </div>

                <style jsx>{`
                    @keyframes progress {
                        0% { transform: scaleX(0); }
                        100% { transform: scaleX(1); }
                    }
                    .animate-progress {
                        animation: progress 8s linear infinite;
                    }
                `}</style>
            </div>

            {isModalOpen && currentAnn && (
                <AnnouncementModal
                    announcement={currentAnn}
                    onClose={() => setIsModalOpen(false)}
                    onMarkAsRead={() => {
                        markAsRead(currentAnn.id);
                        setIsModalOpen(false);
                    }}
                />
            )}
        </>
    );
}
