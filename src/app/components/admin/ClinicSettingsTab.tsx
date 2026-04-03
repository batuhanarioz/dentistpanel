"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { ProfileSettings } from "./settings/ProfileSettings";
import { AssistantSettings } from "./settings/AssistantSettings";
import { ChecklistSettings } from "./settings/ChecklistSettings";
import { WorkingHoursSettings } from "./settings/WorkingHoursSettings";
import { TreatmentsSettings } from "./settings/TreatmentsSettings";
import { DoctorHoursSettings } from "./settings/DoctorHoursSettings";
import { ChannelsSettings } from "./settings/ChannelsSettings";
import { CheckInSettings } from "./settings/CheckInSettings";
import { BookingSettings } from "./settings/BookingSettings";
import { WhatsAppSettings } from "./settings/WhatsAppSettings";

type SubSection = "profile" | "general" | "checklist" | "assistant" | "treatments" | "channels" | "doctor-hours" | "check-in" | "booking" | "whatsapp";

const TAB_ITEMS = [
    { id: 'profile', label: 'Profil', icon: '🏢' },
    { id: 'assistant', label: 'Asistan', icon: '🤖' },
    { id: 'checklist', label: 'Görev', icon: '🛡️' },
    { id: 'general', label: 'Saatler', icon: '⏰' },
    { id: 'doctor-hours', label: 'Hekim', icon: '👨‍⚕️' },
    { id: 'treatments', label: 'Tedavi', icon: '🦷' },
    { id: 'channels', label: 'Kanal', icon: '📱' },
    { id: 'check-in', label: 'QR', icon: '🔲' },
    { id: 'booking', label: 'Randevu', icon: '📅' },
    { id: 'whatsapp', label: 'Online Taslak', icon: '📲' },
] as const;

export function ClinicSettingsTab({ section, hideTabBar = false }: { section?: SubSection; hideTabBar?: boolean } = {}) {
    const clinic = useClinic();
    const [activeSub, setActiveSub] = useState<SubSection>(section ?? "assistant");

    useEffect(() => {
        if (section) setActiveSub(section);
    }, [section]);

    const isOnlineBookingEnabled = clinic.clinicSettings?.is_online_booking_enabled ?? false;
    const visibleTabs = TAB_ITEMS.filter(tab => {
        if (tab.id === "whatsapp") return isOnlineBookingEnabled;
        return true;
    });

    return (
        <div className="w-full space-y-8 pb-24 lg:pb-0 relative">
            {/* Tab Navigation */}
            {!hideTabBar && (
                <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-1.5 shadow-xl shadow-slate-200/5 sticky top-[52px] lg:top-0 z-30 ring-4 ring-slate-100/30 overflow-hidden">
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none snap-x px-0.5 py-0.5">
                        {visibleTabs.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveSub(item.id as SubSection);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[9px] font-black transition-all shrink-0 snap-center ${activeSub === item.id
                                    ? "bg-slate-900 text-white shadow-md shadow-slate-200 scale-[1.02]"
                                    : "text-slate-500 hover:bg-white hover:shadow-sm"
                                    }`}
                            >
                                <span className={`text-sm transition-transform ${activeSub === item.id ? "scale-110" : "grayscale opacity-70"}`}>
                                    {item.icon}
                                </span>
                                <span className="uppercase tracking-widest">{item.label}</span>
                                {activeSub === item.id && (
                                    <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Section Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeSub === "profile" && <ProfileSettings />}
                {activeSub === "assistant" && <AssistantSettings />}
                {activeSub === "checklist" && <ChecklistSettings />}
                {activeSub === "general" && <WorkingHoursSettings />}
                {activeSub === "treatments" && <TreatmentsSettings />}
                {activeSub === "doctor-hours" && <DoctorHoursSettings />}
                {activeSub === "channels" && <ChannelsSettings />}
                {activeSub === "check-in" && <CheckInSettings />}
                {activeSub === "booking" && <BookingSettings />}
                {activeSub === "whatsapp" && <WhatsAppSettings />}
            </div>
        </div>
    );
}
