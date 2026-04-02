"use client";

import { useState } from "react";
import {
    ChevronDown,
    Check,
    Zap,
    Bell,
    Star,
    Wallet,
    Bot,
    Sparkles,
    Package,
} from "lucide-react";
import type { ClinicAddon } from "@/types/database";
import type { ClinicContextValue } from "@/app/context/ClinicContext";

// ─── Tip tanımları ────────────────────────────────────────────────────────────
interface AddonCardProps {
    addon: ClinicAddon;
    clinic: ClinicContextValue;
}

// ─── İkon haritası (DB'den gelen string → Lucide bileşeni) ───────────────────
const ICON_MAP: Record<string, React.ElementType> = {
    Zap, Bell, Star, Wallet, Bot, Sparkles, Package,
};

// ─── Slug'a özel expanded içerik ─────────────────────────────────────────────
function SmartAutomationContent({ clinic }: { clinic: ClinicContextValue }) {
    const notif = clinic.clinicSettings?.notification_settings;
    const activeWorkflows = clinic.n8nWorkflows?.filter((w) => w.enabled) ?? [];
    const totalWorkflows = clinic.n8nWorkflows?.length ?? 0;

    const items = [
        {
            icon: Bell,
            label: "Randevu Hatırlatma",
            description: "Randevu öncesi otomatik SMS/WhatsApp bildirimi",
            enabled: notif?.is_reminder_enabled ?? false,
        },
        {
            icon: Star,
            label: "Memnuniyet Anketi",
            description: "Randevu sonrası hasta memnuniyeti mesajı",
            enabled: notif?.is_satisfaction_enabled ?? false,
        },
        {
            icon: Wallet,
            label: "Ödeme Hatırlatma",
            description: "Vadesi gelen borçlar için otomatik bildirim",
            enabled: notif?.is_payment_enabled ?? false,
        },
    ];

    return (
        <div className="flex flex-col gap-3">
            {/* Bildirim kanalları */}
            <div className="bg-white/10 rounded-2xl border border-white/10 overflow-hidden">
                {items.map((item, idx) => (
                    <div
                        key={idx}
                        className={`flex items-center gap-3 px-4 py-3 ${idx !== items.length - 1 ? "border-b border-white/10" : ""}`}
                    >
                        <div className="h-7 w-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                            <item.icon size={13} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-[11px] font-black leading-none">{item.label}</p>
                            <p className="text-white/50 text-[9px] mt-0.5 font-medium leading-tight">{item.description}</p>
                        </div>
                        <div className={`h-4 w-4 rounded-full shrink-0 flex items-center justify-center ${item.enabled ? "bg-emerald-400" : "bg-white/20"}`}>
                            {item.enabled && <Check size={9} className="text-white" strokeWidth={3} />}
                        </div>
                    </div>
                ))}
            </div>

            {/* İş akışları */}
            {totalWorkflows > 0 && (
                <div className="bg-white/10 rounded-2xl border border-white/10 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2.5">
                        <Bot size={12} className="text-white/70" />
                        <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">İş Akışları</span>
                        <span className="ml-auto text-indigo-200 text-[10px] font-black">
                            {activeWorkflows.length}/{totalWorkflows} Etkin
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {clinic.n8nWorkflows.map((w) => (
                            <div key={w.id} className="flex items-center gap-2">
                                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${w.enabled ? "bg-emerald-400" : "bg-white/25"}`} />
                                <span className="text-white/70 text-[10px] font-medium truncate">{w.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Genel (varsayılan) expanded içerik ─────────────────────────────────────
function GenericAddonContent({ addon }: { addon: ClinicAddon }) {
    return (
        <div className="bg-white/10 rounded-2xl border border-white/10 px-4 py-3">
            <ul className="space-y-2">
                {addon.addon_products.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                        <div className="h-4 w-4 rounded-full bg-emerald-400 flex items-center justify-center shrink-0">
                            <Check size={9} className="text-white" strokeWidth={3} />
                        </div>
                        <span className="text-white/80 text-[11px] font-medium">{f}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ─── Slug → expanded content haritası ────────────────────────────────────────
function AddonExpandedContent({ addon, clinic }: AddonCardProps) {
    switch (addon.addon_products.slug) {
        case "smart_automation":
            return <SmartAutomationContent clinic={clinic} />;
        default:
            return <GenericAddonContent addon={addon} />;
    }
}

// ─── Ana AddonCard bileşeni ──────────────────────────────────────────────────
export function AddonCard({ addon, clinic }: AddonCardProps) {
    const [expanded, setExpanded] = useState(false);
    const product = addon.addon_products;
    const IconComponent = ICON_MAP[product.icon] ?? Zap;

    const waText = encodeURIComponent(
        `Merhaba, NextGency "${product.name}" eklentisi hakkında bilgi almak istiyorum.`
    );

    // Sadece 0'dan büyükse fiyat göster, null/0 → gizle
    const priceLabel =
        product.price_monthly !== null && product.price_monthly > 0
            ? `${product.price_monthly.toLocaleString("tr-TR")} ₺/ay`
            : null;

    return (
        <div className={`rounded-[2rem] bg-gradient-to-br ${product.gradient} shadow-xl relative overflow-hidden flex flex-col`}>
            {/* Dekoratif arka plan ikonu */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <IconComponent size={100} className="text-white" />
            </div>

            {/* Başlık — her zaman görünür, tıklanabilir */}
            <button
                onClick={() => setExpanded((prev) => !prev)}
                className="relative flex items-start justify-between gap-3 p-7 text-left w-full"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">
                            Eklenti
                        </span>
                        {addon.is_enabled ? (
                            <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">
                                Aktif
                            </span>
                        ) : (
                            <span className="bg-white/10 text-white/50 border border-white/10 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">
                                Pasif
                            </span>
                        )}
                    </div>
                    <h2 className="text-white text-xl font-bold leading-tight">{product.name}</h2>
                    <p className="text-white/60 text-[11px] mt-1.5 leading-relaxed font-medium">{product.description}</p>
                </div>
                <div className={`shrink-0 mt-1 h-7 w-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>
                    <ChevronDown size={14} className="text-white" />
                </div>
            </button>

            {/* Özet — kapalı durumda */}
            {!expanded && (
                <div className="relative px-7 pb-7 mt-auto">
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                        {priceLabel ? (
                            <>
                                <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">Fiyat</span>
                                <span className="text-[10px] font-black uppercase text-white">{priceLabel}</span>
                            </>
                        ) : (
                            <span className="text-white/50 text-[10px] font-medium">Detaylar için tıklayın</span>
                        )}
                    </div>
                </div>
            )}

            {/* Detay — açık durumda */}
            {expanded && (
                <div className="relative px-7 pb-7 flex flex-col gap-4">
                    <AddonExpandedContent addon={addon} clinic={clinic} />

                    {/* Fiyat satırı — sadece fiyat varsa göster */}
                    {priceLabel && (
                        <div className="bg-white/10 rounded-2xl border border-white/10 px-4 py-3 flex items-center justify-between">
                            <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">Fiyat</span>
                            <span className="text-[10px] font-black uppercase text-white">{priceLabel}</span>
                        </div>
                    )}

                    {/* WhatsApp CTA */}
                    <button
                        onClick={() => window.open(`https://wa.me/905444412180?text=${waText}`, "_blank")}
                        className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        WhatsApp&apos;tan Bilgi Al
                    </button>
                </div>
            )}
        </div>
    );
}
