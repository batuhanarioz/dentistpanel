"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRehber, useUpdateProtocol } from "@/hooks/useRehber";
import { useClinic } from "@/app/context/ClinicContext";
import { UserRole } from "@/types/database";
import type { TreatmentLibraryItem } from "@/types/database";

// ─── Kategori Renkleri ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    "Koruyucu": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    "Restoratif": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    "Endodontik": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    "Periodontal": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    "Oral Cerrahi": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    "Protetik": { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
    "İmplantoloji": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    "Ortodonti": { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
    "Estetik": { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200" },
    "Pedodonti": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    "Radyoloji": { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
    "Diğer": { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
};

function categoryColor(cat: string) {
    return CATEGORY_COLORS[cat] ?? { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
}

// ─── Protokol Satırlarını Render Et ───────────────────────────────────────────

function ProtocolLines({ text }: { text: string }) {
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    const [checkedState, setCheckedState] = useState<Record<number, boolean>>({});

    const toggleCheck = (index: number) => {
        setCheckedState((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    return (
        <ul className="space-y-2">
            {lines.map((line, i) => {
                const trimmed = line.trim();
                const isHeading = trimmed.endsWith(":");
                // Sadece baştaki tire veya noktaları temizle
                const cleanLine = trimmed.replace(/^[-•*]\s*/, "");

                // Basit Markdown (kalın yazı) desteği: **metin**
                const renderText = (str: string) => {
                    const parts = str.split(/(\*\*.*?\*\*)/g);
                    return parts.map((part, idx) => {
                        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
                            return <strong key={idx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    });
                };

                if (isHeading) {
                    return (
                        <li key={i} className="pt-3 pb-1 text-sm font-semibold text-slate-800 border-b border-slate-100 mb-1">
                            {renderText(cleanLine)}
                        </li>
                    );
                }

                const isChecked = checkedState[i] || false;

                return (
                    <li
                        key={i}
                        className={`flex items-start gap-3 text-sm leading-relaxed cursor-pointer transition-all group ${isChecked ? "text-slate-400" : "text-slate-700 hover:text-slate-900"
                            }`}
                        onClick={() => toggleCheck(i)}
                    >
                        <div className={`mt-0.5 shrink-0 w-4 h-4 rounded shadow-sm border flex items-center justify-center transition-colors ${isChecked
                                ? "bg-teal-500 border-teal-500"
                                : "bg-white border-slate-300 group-hover:border-teal-400"
                            }`}>
                            {isChecked && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                        <span className={`select-none ${isChecked ? "line-through opacity-70" : ""}`}>
                            {renderText(cleanLine)}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

// ─── Sağ Panel (Slide-in Detail) ──────────────────────────────────────────────

interface DetailPanelProps {
    item: TreatmentLibraryItem;
    canEdit: boolean;
    onClose: () => void;
}

function DetailPanel({ item, canEdit, onClose }: DetailPanelProps) {
    const { mutateAsync, isPending } = useUpdateProtocol();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const displayNotes = item.custom_notes ?? item.protocol_notes ?? "";

    function startEdit() {
        setDraft(displayNotes);
        setEditing(true);
        setTimeout(() => textareaRef.current?.focus(), 50);
    }

    async function handleSave() {
        await mutateAsync({ id: item.id, notes: draft });
        setEditing(false);
    }

    const col = categoryColor(item.category);

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

            {/* Panel */}
            <div
                className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-slate-100">
                    <div>
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${col.bg} ${col.text} mb-1.5`}>
                            {item.category}
                        </span>
                        <h2 className="text-lg font-semibold text-slate-800 leading-tight">{item.name}</h2>
                        {item.custom_notes && (
                            <span className="inline-flex items-center gap-1 text-xs text-teal-600 font-medium mt-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Klinik özel protokol
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {!editing ? (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Hazırlık Protokolü</h3>
                                {canEdit && (
                                    <button
                                        onClick={startEdit}
                                        className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Düzenle
                                    </button>
                                )}
                            </div>
                            {displayNotes ? (
                                <ProtocolLines text={displayNotes} />
                            ) : (
                                <p className="text-sm text-slate-400 italic">Bu tedavi için henüz protokol eklenmemiş.</p>
                            )}
                        </>
                    ) : (
                        <>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Protokolü Düzenle</h3>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-3 text-xs text-slate-500 space-y-1.5">
                                <p>• Her satır ayrı bir işlem / checklist öğesi olur.</p>
                                <p>• Satır sonuna iki nokta (<b>:</b>) koyarsanız <b>Başlık</b> olur. (Örn: <i>Kullanılacak Malzemeler:</i>)</p>
                                <p>• Kelimenin başına ve sonuna iki yıldız koyarak <b>**kalın**</b> yapabilirsiniz.</p>
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                rows={14}
                                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                                placeholder="Her satıra bir hazırlık adımı yazın..."
                            />
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={handleSave}
                                    disabled={isPending}
                                    className="flex-1 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium py-2 rounded-xl transition-colors disabled:opacity-60"
                                >
                                    {isPending ? "Kaydediliyor..." : "Kaydet"}
                                </button>
                                <button
                                    onClick={() => setEditing(false)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium py-2 rounded-xl transition-colors"
                                >
                                    İptal
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Ana Sayfa ─────────────────────────────────────────────────────────────────

export default function RehberPage() {
    const { data: items = [], isLoading, error } = useRehber();
    const { userRole, isSuperAdmin } = useClinic();

    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("Tümü");
    const [selected, setSelected] = useState<TreatmentLibraryItem | null>(null);

    // Klavye ESC ile paneli kapat
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setSelected(null);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Düzenleme yetkisi: admin veya doktor
    const canEdit = isSuperAdmin ||
        userRole === UserRole.ADMIN ||
        (userRole as string) === "ADMIN_DOCTOR" ||
        userRole === UserRole.DOKTOR;

    // Kategoriler
    const categories = useMemo(() => {
        const cats = Array.from(new Set(items.map((i) => i.category)));
        return ["Tümü", ...cats];
    }, [items]);

    // Filtrelenmiş liste
    const filtered = useMemo(() => {
        return items.filter((item) => {
            const matchCat = activeCategory === "Tümü" || item.category === activeCategory;
            const matchSearch = !search.trim() ||
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.category.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
        });
    }, [items, activeCategory, search]);

    // Grup bazında göster
    const grouped = useMemo(() => {
        if (activeCategory !== "Tümü") return null;
        const map = new Map<string, TreatmentLibraryItem[]>();
        for (const item of filtered) {
            const arr = map.get(item.category) ?? [];
            arr.push(item);
            map.set(item.category, arr);
        }
        return map;
    }, [filtered, activeCategory]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                <p>Rehber yüklenemedi. Lütfen sayfayı yenileyin.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 pb-10">
            {/* Arama + İstatistik */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tedavi adı veya kategori ara..."
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 px-1">
                    <span className="font-semibold text-slate-700">{filtered.length}</span> tedavi
                    {isLoading && <span className="text-xs text-slate-400 animate-pulse">yükleniyor...</span>}
                </div>
            </div>

            {/* Kategori Tabs */}
            <div className="overflow-x-auto no-scrollbar mb-6">
                <div className="flex gap-1.5 min-w-max pb-1">
                    {categories.map((cat) => {
                        const isActive = activeCategory === cat;
                        const col = cat === "Tümü" ? null : categoryColor(cat);
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${isActive
                                        ? col
                                            ? `${col.bg} ${col.text} ring-1 ${col.border}`
                                            : "bg-slate-800 text-white"
                                        : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                                    }`}
                            >
                                {cat}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Kart Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">Arama kriterlerine uygun tedavi bulunamadı.</p>
                </div>
            ) : grouped ? (
                // "Tümü" seçiliyken gruplu görünüm
                <div className="space-y-8">
                    {Array.from(grouped.entries()).map(([cat, catItems]) => {
                        const col = categoryColor(cat);
                        return (
                            <div key={cat}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${col.bg} ${col.text}`}>{cat}</span>
                                    <span className="text-xs text-slate-400">{catItems.length} tedavi</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {catItems.map((item) => (
                                        <TreatmentCard key={item.id} item={item} onClick={() => setSelected(item)} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // Kategori seçiliyken düz grid
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filtered.map((item) => (
                        <TreatmentCard key={item.id} item={item} onClick={() => setSelected(item)} />
                    ))}
                </div>
            )}

            {/* Detay Paneli */}
            {selected && (
                <DetailPanel
                    item={selected}
                    canEdit={canEdit}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
}

// ─── Tedavi Kartı ──────────────────────────────────────────────────────────────

function TreatmentCard({ item, onClick }: { item: TreatmentLibraryItem; onClick: () => void }) {
    const col = categoryColor(item.category);
    const hasCustom = !!item.custom_notes;

    return (
        <button
            onClick={onClick}
            className="group text-left bg-white border border-slate-100 hover:border-teal-200 hover:shadow-md rounded-2xl p-4 transition-all relative"
        >
            {hasCustom && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-teal-400" title="Klinik özel protokol" />
            )}
            <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full mb-2 ${col.bg} ${col.text}`}>
                {item.category}
            </span>
            <p className="text-sm font-semibold text-slate-700 group-hover:text-teal-700 leading-snug transition-colors">
                {item.name}
            </p>
            {item.protocol_notes && (
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {item.protocol_notes.replace(/^•\s*/gm, "").split("\n")[0]}
                </p>
            )}
        </button>
    );
}
