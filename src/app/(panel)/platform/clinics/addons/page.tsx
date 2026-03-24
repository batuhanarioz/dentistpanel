"use client";

import { useEffect, useState, useCallback } from "react";
import { usePageHeader } from "@/app/components/AppShell";
import { useClinic } from "@/app/context/ClinicContext";
import { supabase } from "@/lib/supabaseClient";
import type { AddonProduct, Clinic } from "@/types/database";
import {
    Package,
    AlertCircle,
    Search,
    Eye,
    EyeOff,
    Power,
    PowerOff,
    Plus,
    ChevronDown,
    Loader2,
    Pencil,
    X,
} from "lucide-react";

// ─── Tipler ──────────────────────────────────────────────────────────────────
interface ClinicAddonRow {
    id: string | null;          // null = henüz oluşturulmamış
    clinic_id: string;
    addon_id: string;
    is_visible: boolean;
    is_enabled: boolean;
    activated_at: string | null;
}

interface ClinicWithAddons extends Clinic {
    addonRows: Record<string, ClinicAddonRow>; // addon_id → row
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────
export default function AddonManagementPage() {
    usePageHeader("Eklenti Yönetimi");
    const authCtx = useClinic();

    const [products, setProducts] = useState<AddonProduct[]>([]);
    const [clinics, setClinics] = useState<ClinicWithAddons[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedClinic, setExpandedClinic] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null); // "clinicId-addonId"

    // Yeni ürün formu
    const [showNewProduct, setShowNewProduct] = useState(false);
    const [newSlug, setNewSlug] = useState("");
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newGradient, setNewGradient] = useState("from-indigo-600 to-violet-700");
    const [newIcon, setNewIcon] = useState("Zap");
    const [newPrice, setNewPrice] = useState<string>("");
    const [creatingProduct, setCreatingProduct] = useState(false);

    // Düzenleme formu
    const [editingProduct, setEditingProduct] = useState<AddonProduct | null>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editGradient, setEditGradient] = useState("");
    const [editIcon, setEditIcon] = useState("");
    const [editPrice, setEditPrice] = useState<string>("");
    const [updatingProduct, setUpdatingProduct] = useState(false);

    const openEdit = (p: AddonProduct) => {
        setEditingProduct(p);
        setEditName(p.name);
        setEditDesc(p.description);
        setEditGradient(p.gradient);
        setEditIcon(p.icon);
        setEditPrice(p.price_monthly !== null ? String(p.price_monthly) : "");
        setShowNewProduct(false);
    };

    const updateProduct = async () => {
        if (!editingProduct) return;
        setUpdatingProduct(true);
        await supabase.from("addon_products").update({
            name: editName.trim(),
            description: editDesc.trim(),
            gradient: editGradient,
            icon: editIcon.trim(),
            price_monthly: editPrice === "" ? null : parseInt(editPrice),
        }).eq("id", editingProduct.id);
        setEditingProduct(null);
        await load();
        setUpdatingProduct(false);
    };

    const load = useCallback(async () => {
        setLoading(true);
        const [{ data: prods }, { data: cls }, { data: allRows }] = await Promise.all([
            supabase.from("addon_products").select("*").order("sort_order"),
            supabase.from("clinics").select("id, name, slug, is_active").order("name"),
            supabase.from("clinic_addons").select("*"),
        ]);

        const prodList: AddonProduct[] = prods ?? [];
        const clinicList: Clinic[] = (cls ?? []) as unknown as Clinic[];
        const rows: ClinicAddonRow[] = allRows ?? [];

        const rowMap: Record<string, Record<string, ClinicAddonRow>> = {};
        for (const r of rows) {
            if (!rowMap[r.clinic_id]) rowMap[r.clinic_id] = {};
            rowMap[r.clinic_id][r.addon_id] = r;
        }

        const withAddons: ClinicWithAddons[] = clinicList.map((c) => ({
            ...c,
            addonRows: rowMap[c.id] ?? {},
        }));

        setProducts(prodList);
        setClinics(withAddons);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Klinik için bir addon satırını toggle et
    const toggleAddonField = async (
        clinic: ClinicWithAddons,
        addon: AddonProduct,
        field: "is_visible" | "is_enabled"
    ) => {
        const key = `${clinic.id}-${addon.id}`;
        setSaving(key);
        const existing = clinic.addonRows[addon.id];

        if (!existing?.id) {
            // Satır yok → oluştur
            const newRow: Omit<ClinicAddonRow, "id"> = {
                clinic_id: clinic.id,
                addon_id: addon.id,
                is_visible: field === "is_visible" ? true : false,
                is_enabled: field === "is_enabled" ? true : false,
                activated_at: field === "is_enabled" ? new Date().toISOString() : null,
            };
            const { data } = await supabase.from("clinic_addons").insert(newRow).select().maybeSingle();
            if (data) {
                setClinics((prev) => prev.map((c) => {
                    if (c.id !== clinic.id) return c;
                    return { ...c, addonRows: { ...c.addonRows, [addon.id]: data as ClinicAddonRow } };
                }));
            }
        } else {
            const updates: Partial<ClinicAddonRow> = { [field]: !existing[field] };
            if (field === "is_enabled" && !existing.is_enabled) {
                updates.activated_at = new Date().toISOString();
            }
            await supabase.from("clinic_addons").update(updates).eq("id", existing.id);
            setClinics((prev) => prev.map((c) => {
                if (c.id !== clinic.id) return c;
                return {
                    ...c,
                    addonRows: {
                        ...c.addonRows,
                        [addon.id]: { ...existing, ...updates },
                    },
                };
            }));
        }
        setSaving(null);
    };

    // Tüm kliniklere bir addon ata (visible=true, enabled=false)
    const assignToAll = async (addon: AddonProduct) => {
        setSaving(`all-${addon.id}`);
        const unassigned = clinics.filter((c) => !clinics.find((x) => x.id === c.id)?.addonRows[addon.id]?.id);
        if (unassigned.length === 0) { setSaving(null); return; }

        const rows = unassigned.map((c) => ({
            clinic_id: c.id,
            addon_id: addon.id,
            is_visible: true,
            is_enabled: false,
            activated_at: null,
        }));
        await supabase.from("clinic_addons").insert(rows);
        await load();
        setSaving(null);
    };

    // Yeni ürün oluştur
    const createProduct = async () => {
        if (!newSlug || !newName) return;
        setCreatingProduct(true);
        await supabase.from("addon_products").insert({
            slug: newSlug.trim().toLowerCase().replace(/\s+/g, "_"),
            name: newName.trim(),
            description: newDesc.trim(),
            features: [],
            price_monthly: newPrice === "" ? null : parseInt(newPrice),
            is_active: true,
            sort_order: products.length + 1,
            gradient: newGradient,
            icon: newIcon,
        });
        setShowNewProduct(false);
        setNewSlug(""); setNewName(""); setNewDesc(""); setNewPrice("");
        await load();
        setCreatingProduct(false);
    };

    if (!authCtx.isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <AlertCircle className="h-6 w-6 text-rose-500" />
                <p className="text-sm font-semibold text-slate-900">Yetkisiz Erişim</p>
            </div>
        );
    }

    const filteredClinics = clinics.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.slug?.toLowerCase().includes(search.toLowerCase())
    );

    const GRADIENT_OPTIONS = [
        "from-indigo-600 to-violet-700",
        "from-teal-500 to-emerald-600",
        "from-rose-500 to-pink-600",
        "from-amber-500 to-orange-500",
        "from-sky-500 to-blue-600",
        "from-slate-700 to-slate-900",
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">

            {/* Başlık + Yeni Ürün */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-100">
                        <Package size={18} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Eklenti Yönetimi</h2>
                        <p className="text-xs text-slate-500 font-medium">Ürünleri tanımlayın, klinik bazında görünürlük ve aktivasyon kontrolü yapın.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowNewProduct((v) => !v)}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                >
                    <Plus size={14} />
                    Yeni Ürün
                </button>
            </div>

            {/* Yeni ürün formu */}
            {showNewProduct && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Slug (unique)</label>
                        <input
                            value={newSlug}
                            onChange={(e) => setNewSlug(e.target.value)}
                            placeholder="smart_automation"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Ürün Adı</label>
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Akıllı Otomasyon"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Açıklama</label>
                        <input
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            placeholder="Kısa açıklama..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Aylık Fiyat (₺, boş=iletişime geç)</label>
                        <input
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            placeholder="0"
                            type="number"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">İkon (Lucide)</label>
                        <input
                            value={newIcon}
                            onChange={(e) => setNewIcon(e.target.value)}
                            placeholder="Zap"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Gradient</label>
                        <div className="flex flex-wrap gap-2">
                            {GRADIENT_OPTIONS.map((g) => (
                                <button
                                    key={g}
                                    onClick={() => setNewGradient(g)}
                                    className={`h-8 w-16 rounded-xl bg-gradient-to-br ${g} ${newGradient === g ? "ring-2 ring-offset-2 ring-indigo-500" : ""}`}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-3">
                        <button
                            onClick={() => setShowNewProduct(false)}
                            className="px-5 py-2.5 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={createProduct}
                            disabled={creatingProduct || !newSlug || !newName}
                            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
                        >
                            {creatingProduct && <Loader2 size={12} className="animate-spin" />}
                            Oluştur
                        </button>
                    </div>
                </div>
            )}

            {/* Ürün kartları */}
            {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((p) => {
                        const assignedCount = clinics.filter((c) => c.addonRows[p.id]?.is_visible).length;
                        const enabledCount = clinics.filter((c) => c.addonRows[p.id]?.is_enabled).length;
                        return (
                            <div key={p.id} className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${p.gradient} p-5 shadow-lg text-white`}>
                                <div className="absolute right-3 top-3 opacity-10">
                                    <Package size={48} />
                                </div>
                                {/* Düzenle butonu */}
                                <button
                                    onClick={() => openEdit(p)}
                                    className="absolute top-3 right-3 h-7 w-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all z-10"
                                    title="Düzenle"
                                >
                                    <Pencil size={12} className="text-white" />
                                </button>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">{p.slug}</p>
                                <h3 className="text-sm font-black">{p.name}</h3>
                                <div className="mt-3 flex gap-3 text-[10px] font-bold">
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full">{assignedCount} görünür</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full">{enabledCount} aktif</span>
                                </div>
                                <button
                                    onClick={() => assignToAll(p)}
                                    disabled={saving === `all-${p.id}`}
                                    className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase tracking-widest py-1.5 rounded-xl transition-all flex items-center justify-center gap-1"
                                >
                                    {saving === `all-${p.id}` ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                                    Tüm Kliniklere Ata
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Ürün düzenleme formu */}
            {editingProduct && (
                <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${editGradient}`} />
                            <p className="text-sm font-black text-slate-900">Düzenle: <span className="text-indigo-600">{editingProduct.slug}</span></p>
                        </div>
                        <button onClick={() => setEditingProduct(null)} className="h-7 w-7 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                            <X size={13} className="text-slate-500" />
                        </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Ürün Adı</label>
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">İkon (Lucide)</label>
                            <input
                                value={editIcon}
                                onChange={(e) => setEditIcon(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Açıklama</label>
                            <input
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Aylık Fiyat (₺, boş = fiyat gösterilmez)</label>
                            <input
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                type="number"
                                placeholder="Boş bırakın"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-400"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Gradient</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    "from-indigo-600 to-violet-700",
                                    "from-teal-500 to-emerald-600",
                                    "from-rose-500 to-pink-600",
                                    "from-amber-500 to-orange-500",
                                    "from-sky-500 to-blue-600",
                                    "from-slate-700 to-slate-900",
                                ].map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setEditGradient(g)}
                                        className={`h-8 w-16 rounded-xl bg-gradient-to-br ${g} ${editGradient === g ? "ring-2 ring-offset-2 ring-indigo-500" : ""}`}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="sm:col-span-2 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingProduct(null)}
                                className="px-5 py-2.5 text-xs font-black text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={updateProduct}
                                disabled={updatingProduct || !editName}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                                {updatingProduct && <Loader2 size={12} className="animate-spin" />}
                                Güncelle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Klinik bazında kontrol */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Klinik Bazında Kontrol</h3>
                    <div className="relative ml-auto">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Klinik ara..."
                            className="pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 w-52"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    {filteredClinics.map((clinic) => (
                        <div key={clinic.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Klinik başlık satırı */}
                            <button
                                onClick={() => setExpandedClinic((prev) => prev === clinic.id ? null : clinic.id)}
                                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                            >
                                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-black shrink-0 uppercase">
                                    {clinic.name?.[0] ?? "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-slate-900 truncate">{clinic.name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{clinic.slug}</p>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    {products.map((p) => {
                                        const row = clinic.addonRows[p.id];
                                        return row?.is_visible ? (
                                            <div key={p.id} className={`h-2 w-2 rounded-full ${row.is_enabled ? "bg-emerald-400" : "bg-amber-400"}`} title={`${p.name}: ${row.is_enabled ? "Aktif" : "Görünür/Pasif"}`} />
                                        ) : null;
                                    })}
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={`text-slate-400 transition-transform shrink-0 ${expandedClinic === clinic.id ? "rotate-180" : ""}`}
                                />
                            </button>

                            {/* Genişletilmiş addon satırları */}
                            {expandedClinic === clinic.id && (
                                <div className="border-t border-slate-100 divide-y divide-slate-50">
                                    {products.map((p) => {
                                        const row = clinic.addonRows[p.id];
                                        const isVisible = row?.is_visible ?? false;
                                        const isEnabled = row?.is_enabled ?? false;
                                        const key = `${clinic.id}-${p.id}`;

                                        return (
                                            <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                                                <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center shrink-0`}>
                                                    <Package size={14} className="text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-slate-800">{p.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{p.slug}</p>
                                                </div>

                                                {/* Görünürlük toggle */}
                                                <button
                                                    onClick={() => toggleAddonField(clinic, p, "is_visible")}
                                                    disabled={saving === key}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isVisible
                                                        ? "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100"
                                                        : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    {saving === key ? (
                                                        <Loader2 size={10} className="animate-spin" />
                                                    ) : isVisible ? (
                                                        <Eye size={10} />
                                                    ) : (
                                                        <EyeOff size={10} />
                                                    )}
                                                    {isVisible ? "Görünür" : "Gizli"}
                                                </button>

                                                {/* Aktiflik toggle */}
                                                <button
                                                    onClick={() => toggleAddonField(clinic, p, "is_enabled")}
                                                    disabled={saving === key}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isEnabled
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                                                        : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    {saving === key ? (
                                                        <Loader2 size={10} className="animate-spin" />
                                                    ) : isEnabled ? (
                                                        <Power size={10} />
                                                    ) : (
                                                        <PowerOff size={10} />
                                                    )}
                                                    {isEnabled ? "Aktif" : "Pasif"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
