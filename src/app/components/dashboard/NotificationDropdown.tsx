"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useChecklist } from "@/hooks/useChecklist";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { AnnouncementModal } from "./AnnouncementModal";
import { format } from "date-fns";
import { Announcement } from "@/types/database";
import { tr } from "date-fns/locale";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";

type PanelNotification = {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    created_at: string;
};

export function NotificationDropdown() {
    const { controlItems, checklistLoading } = useChecklist(0);
    const { announcements, markAsRead } = useAnnouncements();
    const { userId } = useClinic();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [panelNotifications, setPanelNotifications] = useState<PanelNotification[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchPanelNotifications = useCallback(async () => {
        if (!userId) return;
        const { data } = await supabase
            .from("panel_notifications")
            .select("id, type, title, body, link, created_at")
            .eq("user_id", userId)
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(20);
        setPanelNotifications(data ?? []);
    }, [userId]);

    useEffect(() => {
        fetchPanelNotifications();
    }, [fetchPanelNotifications]);

    // Realtime: yeni panel bildirimi geldiğinde güncelle
    useEffect(() => {
        if (!userId) return;
        const channel = supabase
            .channel("panel_notifications_realtime")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "panel_notifications", filter: `user_id=eq.${userId}` },
                () => fetchPanelNotifications()
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [userId, fetchPanelNotifications]);

    const markPanelNotificationRead = async (id: string) => {
        await supabase.from("panel_notifications").update({ is_read: true }).eq("id", id);
        setPanelNotifications(prev => prev.filter(n => n.id !== id));
    };

    const pendingCount = (controlItems?.length || 0) + (announcements?.length || 0) + panelNotifications.length;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getIcon = (code: string) => {
        switch (code) {
            case 'STATUS_UPDATE': return (
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
            );
            case 'MISSING_PAYMENT': return (
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            );
            case 'MISSING_NOTE': return (
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </div>
            );
            default: return (
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
            );
        }
    };

    const getAnnIcon = (type: string) => {
        const colors = type === 'danger' ? 'bg-rose-100 text-rose-600' :
            type === 'warning' ? 'bg-amber-100 text-amber-600' :
                type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600';
        return (
            <div className={`p-2 ${colors} rounded-xl`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.062.51.11.77.143l3.61 2.888a.75.75 0 0 0 1.25-.561V5.722a.75.75 0 0 0-1.25-.561l-3.61 2.888a24.42 24.42 0 0 1-.77.143m0 9.18V8.752" />
                </svg>
            </div>
        );
    };

    const handleNotificationClick = (id: string) => {
        const slug = window.location.pathname.split('/')[1];
        window.location.href = `/${slug}#task-${id}`;
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bildirim Butonu */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md'
                    }`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white animate-in zoom-in">
                        {pendingCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <h3 className="text-sm font-bold text-slate-900">Bildirimler</h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-slate-100">
                            {format(new Date(), 'd MMMM', { locale: tr })}
                        </span>
                    </div>

                    {/* Content */}
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                        {checklistLoading ? (
                            <div className="p-10 text-center text-slate-400 text-xs animate-pulse">Yükleniyor...</div>
                        ) : pendingCount === 0 ? (
                            <div className="p-10 text-center">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-500">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-sm font-bold text-slate-900">Hepsi Tamam!</p>
                                <p className="text-xs text-slate-500 mt-1">Bekleyen kontrol veya mesaj bulunmuyor.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {/* PANEL BİLDİRİMLERİ */}
                                {panelNotifications.map((notif) => (
                                    <div
                                        key={`panel-${notif.id}`}
                                        onClick={() => { markPanelNotificationRead(notif.id); if (notif.link) window.location.href = notif.link; setIsOpen(false); }}
                                        className="p-4 bg-blue-50/40 hover:bg-blue-50 transition-colors group cursor-pointer border-l-4 border-blue-400"
                                    >
                                        <div className="flex gap-3">
                                            <div className="shrink-0 p-2 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className="text-xs font-bold text-slate-900 truncate">{notif.title}</span>
                                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-tight shrink-0">Yeni</span>
                                                </div>
                                                {notif.body && <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{notif.body}</p>}
                                                <p className="text-[10px] text-slate-400 mt-0.5">{format(new Date(notif.created_at), 'd MMM HH:mm', { locale: tr })}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* PLATFORM DUYURULARI */}
                                {announcements.map((ann) => (
                                    <div
                                        key={`ann-${ann.id}`}
                                        onClick={() => { setSelectedAnnouncement(ann); setIsOpen(false); }}
                                        className="p-4 bg-slate-50/50 hover:bg-slate-100 transition-colors group cursor-pointer border-l-4 border-transparent hover:border-indigo-400"
                                    >
                                        <div className="flex gap-3">
                                            <div className="shrink-0 group-hover:scale-110 transition-transform">{getAnnIcon(ann.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Sistem Duyurusu</span>
                                                </div>
                                                <p className="text-xs font-black text-slate-900 leading-tight mb-1">{ann.title}</p>
                                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed line-clamp-2">{ann.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Kontrol Listesi Bildirimleri */}
                                {controlItems.map((item) => (
                                    <div
                                        key={`control-${item.id}`}
                                        onClick={() => handleNotificationClick(item.id)}
                                        className="p-4 hover:bg-slate-50 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex gap-3">
                                            <div className="shrink-0 group-hover:scale-110 transition-transform">{getIcon(item.code)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className="text-xs font-bold text-slate-900 truncate">{item.patientName}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium shrink-0">{item.timeLabel.split('-')[0].trim()}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{item.title}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-slate-50 bg-slate-50/30 text-center">
                        <button
                            onClick={() => { window.location.href = `/${window.location.pathname.split('/')[1]}`; setIsOpen(false); }}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                            Tüm Kontrolleri Gör
                        </button>
                    </div>
                </div>
            )}

            {selectedAnnouncement && (
                <AnnouncementModal
                    announcement={selectedAnnouncement}
                    onClose={() => setSelectedAnnouncement(null)}
                    onMarkAsRead={() => markAsRead(selectedAnnouncement.id)}
                />
            )}
        </div>
    );
}
