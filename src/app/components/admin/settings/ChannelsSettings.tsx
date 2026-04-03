"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";

export function ChannelsSettings() {
    const clinic = useClinic();
    const [channels, setChannels] = useState<string[]>(clinic.clinicSettings?.appointment_channels ?? []);
    const [newChannelName, setNewChannelName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        setChannels(clinic.clinicSettings?.appointment_channels ?? []);
    }, [clinic.clinicSettings]);

    const saveChannelsToDB = async (updated: string[]) => {
        if (!clinic.clinicId) return;
        const { error } = await supabase
            .from("clinic_settings")
            .update({ appointment_channels: updated })
            .eq("clinic_id", clinic.clinicId)
            .select("id")
            .single();
        if (error) {
            setSaveMessage({ type: 'error', text: `Hata: ${error.message}` });
            setTimeout(() => setSaveMessage(null), 4000);
        }
    };

    const handleAddChannel = async () => {
        const name = newChannelName.trim();
        if (!name || !clinic.clinicId) return;
        if (channels.includes(name)) return;
        const updated = [...channels, name];
        setChannels(updated);
        setNewChannelName("");
        setSaveMessage(null);
        setIsLoading(true);
        try {
            await saveChannelsToDB(updated);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteChannel = async (name: string) => {
        if (!clinic.clinicId) return;
        const updated = channels.filter(c => c !== name);
        setChannels(updated);
        setIsLoading(true);
        try {
            await saveChannelsToDB(updated);
            await supabase
                .from("appointments")
                .update({ channel: null })
                .eq("clinic_id", clinic.clinicId)
                .eq("channel", name);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black text-slate-900">Kanal Yönetimi</h3>
                    {isLoading && <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />}
                </div>
            </div>
            <div className="px-8 py-5 bg-indigo-50/40 border-b border-indigo-100/60">
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    Randevu kanalları, hastanın kliniğe nasıl ulaştığını takip etmek için kullanılır — örneğin <span className="font-black text-slate-800">Instagram</span>, <span className="font-black text-slate-800">Telefon</span>, <span className="font-black text-slate-800">Google</span> veya <span className="font-black text-slate-800">Tavsiye</span>. Yeni randevu eklerken veya düzenlerken bu listeden seçim yapılabilir. Silinen bir kanalın atandığı randevular otomatik olarak &quot;Belirtilmedi&quot; olarak güncellenir.
                </p>
            </div>

            <div className="p-5 space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Kanal adı gir, Ekle'ye bas..."
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChannel(); } }}
                        disabled={isLoading}
                        className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all disabled:opacity-50"
                    />
                    <button
                        onClick={handleAddChannel}
                        disabled={!newChannelName.trim() || isLoading}
                        className="h-10 px-5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wide shadow-sm hover:shadow-md transition-all active:scale-[0.97] disabled:opacity-40"
                    >
                        Ekle
                    </button>
                </div>

                {channels.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                        <p className="text-xs font-semibold text-slate-400">Henüz kanal yok. Randevular &quot;Belirtilmedi&quot; görünür.</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {channels.map((ch) => (
                            <div key={ch} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-all">
                                <span className="text-sm font-bold text-slate-700">{ch}</span>
                                <button
                                    onClick={() => handleDeleteChannel(ch)}
                                    disabled={isLoading}
                                    className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-rose-500 transition-all disabled:opacity-40"
                                    title="Sil"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {saveMessage && (
                    <div className={`px-3 py-2 rounded-xl text-xs font-bold ${saveMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                        {saveMessage.text}
                    </div>
                )}
            </div>
        </div>
    );
}
