"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useClinic } from "@/app/context/ClinicContext";
import { format, startOfDay, subDays, subMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import {
    Users,
    CreditCard,
    AlertTriangle,
    Clock,
    MapPin,
    Zap,
    LifeBuoy,
    TrendingDown,
    Activity as PulseIcon,
    Phone,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    RotateCcw,
    ExternalLink,
    Banknote,
    Waves,
    StickyNote,
    Send,
} from "lucide-react";
import { getDunningAction, buildWhatsAppUrl, daysSince } from "@/lib/dunning";
import { CreditCard as CardIcon } from "lucide-react";

type ActivityType = 'registration' | 'subscription' | 'support' | 'alert' | 'expired';

interface Activity {
    id: string;
    type: ActivityType;
    title: string;
    detail: string;
    time: Date;
    status: 'success' | 'info' | 'error' | 'warning';
    location?: string;
    message?: string;
    priority?: string;
    phone?: string;
    isSupport?: boolean;
    clinicId?: string;
    clinicSlug?: string;
}

export default function PlatformActivityPage() {
    const clinic = useClinic();
    const [loading, setLoading] = useState(true);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [dateFilter, setDateFilter] = useState<'7d' | '30d' | 'all'>('7d');
    const [clinicFilter, setClinicFilter] = useState<string>('');
    const [stats, setStats] = useState({
        totalClinics: 0,
        activeSubscriptions: 0,
        trialClinics: 0,
        expiringSoon: 0,
        todayAppointments: 0,
        todayPatients: 0,
        mrr: 0,
        actualPaymentTotal: 0,
        liveActive: 0
    });

    const [activities, setActivities] = useState<Activity[]>([]);
    const [archivedActivities, setArchivedActivities] = useState<Activity[]>([]);
    const [showArchive, setShowArchive] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [churnClinics, setChurnClinics] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [dunningClinics, setDunningClinics] = useState<any[]>([]);
    const [expandedSupportId, setExpandedSupportId] = useState<string | null>(null);

    // Support note state (local — keyed by activity id)
    const [supportNotes, setSupportNotes] = useState<Record<string, string>>({});
    const [savingNote, setSavingNote] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        const today = startOfDay(new Date()).toISOString();
        const startThreshold = dateFilter === 'all' ? undefined
            : dateFilter === '30d' ? subDays(new Date(), 30).toISOString()
                : subDays(new Date(), 7).toISOString();
        const oneHourAgo = subMinutes(new Date(), 60).toISOString();

        // --- 1. Platform data + pricing ---
        const [clinicsRes, apptRes, patientRes, settingsRes, paymentsRes] = await Promise.all([
            supabase.from("clinics").select("id, name, subscription_status, billing_cycle, current_period_end, last_active_at, created_at"),
            supabase.from("appointments").select("*", { count: 'exact', head: true }).gte("created_at", today),
            supabase.from("patients").select("*", { count: 'exact', head: true }).gte("created_at", today),
            supabase.from("platform_settings").select("monthly_price, annual_price").eq("id", "global").single(),
            supabase.from("payments").select("amount").eq("status", "paid"),
        ]);

        const allClinics = clinicsRes.data;
        const monthlyPrice = settingsRes.data?.monthly_price ?? 1499;
        const annualPrice = settingsRes.data?.annual_price ?? 14990;
        const annualMRR = Math.round(annualPrice / 12);
        const actualPaymentTotal = (paymentsRes.data || []).reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0);

        if (allClinics) {
            let totalMRR = 0;
            let liveActiveCount = 0;
            let expiringSoonCount = 0;
            let trialCount = 0;
            let activeSubCount = 0;

            const now = new Date();
            const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            allClinics.forEach(c => {
                if (c.subscription_status === 'active') {
                    activeSubCount++;
                    if (c.billing_cycle === 'annual') totalMRR += annualMRR;
                    else if (c.billing_cycle === 'monthly') totalMRR += monthlyPrice;
                }
                if (c.subscription_status === 'trialing') trialCount++;
                if (c.last_active_at && new Date(c.last_active_at) > new Date(oneHourAgo)) liveActiveCount++;
                if (c.current_period_end) {
                    const end = new Date(c.current_period_end);
                    if (end > now && end < sevenDaysFromNow) expiringSoonCount++;
                }
            });

            setStats({
                totalClinics: allClinics.length,
                activeSubscriptions: activeSubCount,
                trialClinics: trialCount,
                expiringSoon: expiringSoonCount,
                todayAppointments: apptRes.count || 0,
                todayPatients: patientRes.count || 0,
                mrr: totalMRR,
                actualPaymentTotal,
                liveActive: liveActiveCount
            });
        }

        // --- 2. Dismissed IDs ---
        const { data: dismissals } = await supabase.from("platform_activity_dismissals")
            .select("activity_id")
            .eq("admin_id", (await supabase.auth.getUser()).data.user?.id);
        const dismissedIds = new Set((dismissals || []).map(d => d.activity_id));

        // --- 3. Churn Risk ---
        const sevenDaysAgo = subDays(new Date(), 7).toISOString();
        const [riskyClinicsRes, dunningRes] = await Promise.all([
            supabase.from("clinics")
                .select("id, name, slug, phone, last_active_at, subscription_status")
                .lt("last_active_at", sevenDaysAgo)
                .order("last_active_at", { ascending: true })
                .limit(5),
            supabase.from("clinics")
                .select("id, name, slug, phone, subscription_status, billing_cycle, dunning_started_at, retry_count")
                .in("subscription_status", ["past_due", "restricted"])
                .order("dunning_started_at", { ascending: true }),
        ]);
        setChurnClinics(riskyClinicsRes.data || []);
        setDunningClinics(dunningRes.data || []);

        // --- 4. Activity Feed ---
        let clinicQuery = supabase.from("clinics")
            .select("id, name, slug, created_at, city, district, subscription_status, phone")
            .order("created_at", { ascending: false });
        if (startThreshold) clinicQuery = clinicQuery.gte("created_at", startThreshold);
        const { data: recentClinics } = await clinicQuery.limit(20);

        const registrationActivities: Activity[] = (recentClinics || [])
            .filter(c => !dismissedIds.has(`reg-${c.id}`))
            .map(c => ({
                id: `reg-${c.id}`,
                type: 'registration',
                title: 'Yeni Klinik Kaydı',
                detail: `${c.name} (${c.subscription_status === 'trialing' ? 'Deneme' : 'Aktif'}) sisteme katıldı.`,
                time: new Date(c.created_at),
                status: 'success',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                location: (c as any).city ? `${(c as any).city} / ${(c as any).district || ''}` : undefined,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                phone: (c as any).phone,
                clinicId: c.id,
                clinicSlug: c.slug
            }));

        let paymentQuery = supabase.from("payment_history")
            .select("id, amount, package_name, created_at, clinics(id, name, slug, city, district)")
            .order("created_at", { ascending: false });
        if (startThreshold) paymentQuery = paymentQuery.gte("created_at", startThreshold);
        const { data: recentPayments } = await paymentQuery.limit(20);

        const paymentActivities: Activity[] = (recentPayments || [])
            .filter(p => !dismissedIds.has(`pay-${p.id}`))
            .map(p => ({
                id: `pay-${p.id}`,
                type: 'subscription',
                title: 'Ödeme Alındı',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                detail: `${(p.clinics as any)?.name || 'Bilinmeyen Klinik'} - ${p.package_name} paketi ödemesi tamamlandı.`,
                time: new Date(p.created_at),
                status: 'info',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                location: (p.clinics as any)?.city ? `${(p.clinics as any).city} / ${(p.clinics as any).district || ''}` : undefined,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                clinicId: (p.clinics as any)?.id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                clinicSlug: (p.clinics as any)?.slug
            }));

        // Active (not archived) support requests — always filtered regardless of dateFilter
        // Use neq(true) instead of eq(false) so rows with is_archived=null are also included
        const [supportRes, archivedSupportRes] = await Promise.all([
            supabase.from("platform_support_requests")
                .select("*, clinics(id, name, slug, city, district, phone)")
                .neq("is_archived", true)
                .order("created_at", { ascending: false })
                .limit(30),
            supabase.from("platform_support_requests")
                .select("*, clinics(id, name, slug, city, district, phone)")
                .eq("is_archived", true)
                .order("created_at", { ascending: false })
                .limit(20),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapSupport = (s: any): Activity => ({
            id: `sup-${s.id}`,
            type: 'support',
            title: s.is_archived ? 'Çözülmüş Destek Talebi' : 'Destek Talebi',
            detail: `${s.clinics?.name || 'Bilinmeyen Klinik'} - Konu: ${s.subject}`,
            time: new Date(s.created_at),
            status: s.is_archived ? 'success' : (s.priority === 'urgent' || s.priority === 'high' ? 'error' : 'warning'),
            message: s.message,
            priority: s.priority,
            location: s.clinics?.city ? `${s.clinics.city} / ${s.clinics.district || ''}` : undefined,
            phone: s.clinics?.phone,
            isSupport: true,
            clinicId: s.clinics?.id,
            clinicSlug: s.clinics?.slug,
        });

        const supportActivities: Activity[] = (supportRes.data || []).map(mapSupport);
        setArchivedActivities((archivedSupportRes.data || []).map(mapSupport));

        const merged = [...registrationActivities, ...paymentActivities, ...supportActivities]
            .sort((a, b) => b.time.getTime() - a.time.getTime());
        setActivities(merged);
        setLoading(false);
    }, [dateFilter]);

    useEffect(() => {
        if (clinic.isSuperAdmin) {
            loadData();
        }
    }, [clinic.isSuperAdmin, loadData]);

    const filters = [
        { id: 'registration', label: 'Kayıtlar', icon: Users, color: 'blue' },
        { id: 'subscription', label: 'Ödemeler', icon: CreditCard, color: 'emerald' },
        { id: 'support', label: 'Destek', icon: LifeBuoy, color: 'amber' },
        { id: 'alert', label: 'Uyarılar', icon: AlertTriangle, color: 'rose' },
    ];

    const handleDeleteActivity = async (activity: Activity) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        if (activity.type === 'support') {
            await supabase.from("platform_support_requests")
                .update({ is_archived: true })
                .eq("id", activity.id.replace('sup-', ''));
        } else {
            await supabase.from("platform_activity_dismissals").insert({
                admin_id: userData.user.id,
                activity_id: activity.id
            });
        }
        setActivities(prev => prev.filter(a => a.id !== activity.id));
        if (expandedSupportId === activity.id) setExpandedSupportId(null);
    };

    const handleClearAll = async () => {
        if (!window.confirm("Bütün bekleyen bildirimleri temizlemek istediğinizden emin misiniz?")) return;
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        setLoading(true);
        const supportIds = activities.filter(a => a.type === 'support').map(a => a.id.replace('sup-', ''));
        if (supportIds.length > 0) {
            await supabase.from("platform_support_requests").update({ is_archived: true }).in("id", supportIds);
        }
        const otherIds = activities.filter(a => a.type !== 'support').map(a => a.id);
        if (otherIds.length > 0) {
            const dismissRecords = otherIds.map(id => ({ admin_id: userData.user!.id, activity_id: id }));
            await supabase.from("platform_activity_dismissals").insert(dismissRecords);
        }
        setActivities([]);
        setLoading(false);
    };

    const handleSaveNote = async (activityId: string, supportDbId: string) => {
        const note = supportNotes[activityId] || '';
        if (!note.trim()) return;
        setSavingNote(activityId);
        await supabase.from("platform_support_requests").update({ admin_note: note }).eq("id", supportDbId);
        setSavingNote(null);
    };

    const toggleFilter = (filterId: string) => {
        setActiveFilters(prev =>
            prev.includes(filterId)
                ? prev.filter(id => id !== filterId)
                : [...prev, filterId]
        );
    };

    const filteredActivities = useMemo(() => {
        let result = activities;
        if (activeFilters.length > 0) result = result.filter(act => activeFilters.includes(act.type));
        if (clinicFilter.trim()) {
            const q = clinicFilter.trim().toLowerCase();
            result = result.filter(act => act.title.toLowerCase().includes(q) || act.detail.toLowerCase().includes(q));
        }
        return result;
    }, [activeFilters, clinicFilter, activities]);

    const toggleExpandSupport = (id: string) => {
        setExpandedSupportId(prev => prev === id ? null : id);
    };

    if (!clinic.isSuperAdmin) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 pt-2 md:pt-4 px-4 md:px-0">
            {/* Header / Pulse Stats */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6">
                {/* Canlı Nabız Card */}
                <div className="flex items-center gap-4 bg-white px-5 md:px-6 py-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex-1 sm:flex-none">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <PulseIcon className="text-indigo-600 animate-pulse" size={24} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Canlı Nabız (Bugün)</h2>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-[10px] md:text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Zap size={14} className="text-amber-500" /> {stats.todayAppointments} <span className="hidden sm:inline">Randevu</span>
                            </span>
                            <span className="text-[10px] md:text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Users size={14} className="text-blue-500" /> {stats.todayPatients} <span className="hidden sm:inline">Yeni Hasta</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Canlı Trafik Card */}
                <div className="flex items-center gap-4 bg-slate-900 px-5 md:px-6 py-4 rounded-[2rem] text-white shadow-xl shadow-slate-900/10 border border-slate-800 flex-1 sm:flex-none">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Waves className="text-emerald-400 animate-bounce duration-[2000ms]" size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Canlı Trafik</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-lg md:text-xl font-black text-emerald-400">{stats.liveActive}</span>
                            <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">KLİNİK AKTİF</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <MetricCard
                    title="Tahmini MRR"
                    value={`${stats.mrr.toLocaleString("tr-TR")} ₺`}
                    icon={<Banknote className="text-emerald-500" />}
                    trend="Aylık"
                    subtitle={`Gerçek: ${stats.actualPaymentTotal.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}`}
                />
                <MetricCard title="TOPLAM" value={stats.totalClinics} icon={<BuildingIcon className="text-blue-500" />} trend="Klinik" />
                <MetricCard title="DENEME" value={stats.trialClinics} icon={<Clock className="text-amber-500" />} trend="Ücretsiz" />
                <MetricCard title="KRİTİK" value={stats.expiringSoon} icon={<AlertTriangle className="text-rose-500" />} trend="Bitiş" isAlert={stats.expiringSoon > 0} />
            </div>

            {/* Filters Toolbar */}
            <div className="flex flex-col gap-3">
                {/* Date range + Clinic filter row */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                        {([['7d', 'Son 7 Gün'], ['30d', 'Son 30 Gün'], ['all', 'Tümü']] as const).map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => setDateFilter(val)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === val ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 min-w-[160px] max-w-xs">
                        <input
                            type="text"
                            placeholder="Klinik ara..."
                            value={clinicFilter}
                            onChange={e => setClinicFilter(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                        />
                    </div>
                    <button onClick={loadData} className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-4 py-2.5 rounded-2xl hover:bg-indigo-100 transition-colors">
                        <RotateCcw size={13} /> Yenile
                    </button>
                </div>

                {/* Type filters */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {filters.map((f) => {
                        const isActive = activeFilters.includes(f.id);
                        return (
                            <button
                                key={f.id}
                                onClick={() => toggleFilter(f.id)}
                                className={`flex items-center shrink-0 gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-200'}`}
                            >
                                <f.icon size={12} className={isActive ? 'text-white' : `text-${f.color}-500`} />
                                {f.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Activity Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="text-[11px] md:text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={16} className="text-slate-400 shrink-0" />
                            <span className="truncate">
                                {dateFilter === 'all' ? 'Tüm Aktiviteler' : dateFilter === '30d' ? 'Son 30 Gün' : 'Son 7 Gün'}
                                {filteredActivities.length > 0 && <span className="text-slate-400 font-bold ml-1">({filteredActivities.length})</span>}
                            </span>
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowArchive(p => !p)}
                                className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${showArchive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                <RotateCcw size={11} />
                                Arşiv {archivedActivities.length > 0 && `(${archivedActivities.length})`}
                            </button>
                            {activities.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="text-[9px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-rose-100 transition-colors"
                                >
                                    Temizle
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 divide-y divide-slate-50 overflow-hidden min-h-[400px]">
                        {loading ? (
                            <div className="h-full flex items-center justify-center p-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
                            </div>
                        ) : filteredActivities.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-16 text-center space-y-4">
                                <div className="p-5 bg-slate-100 rounded-full text-slate-300">
                                    <CheckCircle size={32} />
                                </div>
                                <h4 className="text-xs font-black text-slate-900 uppercase">Tertemiz!</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Bekleyen bir bildirim bulunmuyor.</p>
                            </div>
                        ) : (
                            filteredActivities.map((act) => (
                                <div key={act.id} className="group p-4 md:p-6 hover:bg-slate-50 transition-colors flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-start gap-3 md:gap-4">
                                        <div className={`mt-1 h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center shrink-0 ${act.status === 'success' ? 'bg-emerald-50 text-emerald-600' :
                                            act.status === 'error' ? 'bg-rose-50 text-rose-600' :
                                                act.status === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                            }`}>
                                            {act.type === 'registration' && <Users size={18} />}
                                            {act.type === 'subscription' && <CreditCard size={18} />}
                                            {act.type === 'support' && <LifeBuoy size={18} />}
                                            {act.type === 'alert' && <AlertTriangle size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0" onClick={() => act.isSupport && toggleExpandSupport(act.id)}>
                                            <div className="flex items-center justify-between mb-1 gap-2">
                                                <h4 className="text-xs md:text-sm font-black text-slate-900 truncate flex items-center gap-2">
                                                    {act.title}
                                                    {act.isSupport && dateFilter !== 'all' && (
                                                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                                    )}
                                                </h4>
                                                <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                                                    {act.priority && (
                                                        <span className={`text-[8px] md:text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${act.priority === 'urgent' ? 'bg-rose-600 text-white' :
                                                            act.priority === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            {act.priority === 'urgent' ? 'Acil' : act.priority === 'high' ? 'Yük' : 'Nor'}
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400">
                                                        {format(act.time, 'HH:mm', { locale: tr })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <p className="text-[11px] md:text-xs text-slate-500 font-bold leading-relaxed">
                                                    {act.detail}
                                                </p>
                                                {act.location && (
                                                    <div className="flex items-center gap-1.5 mt-0.5 border border-slate-100 bg-white w-fit px-2 py-0.5 rounded-lg shadow-sm">
                                                        <MapPin size={10} className="text-rose-500 shrink-0" />
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px]">{act.location}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
                                            {act.clinicSlug && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); window.open(`/${act.clinicSlug}`, '_blank'); }}
                                                    className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"
                                                    title="Kliniğe Git"
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteActivity(act); }}
                                                className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all"
                                                title="Çözüldü / Kapat"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                            {act.isSupport && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleExpandSupport(act.id); }}
                                                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                                                >
                                                    {expandedSupportId === act.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Support Details (Expanded) */}
                                    {act.type === 'support' && expandedSupportId === act.id && (
                                        <div className="ml-0 md:ml-14 bg-slate-50 rounded-2xl p-4 md:p-5 border border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                            {/* Message */}
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageSquare size={14} className="text-slate-400" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Talep Mesajı</span>
                                                </div>
                                                <p className="text-xs text-slate-700 font-bold leading-relaxed bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                    {act.message}
                                                </p>
                                            </div>

                                            {/* Admin Note */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <StickyNote size={13} className="text-amber-500" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İç Not</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <textarea
                                                        rows={2}
                                                        placeholder="Bu talep hakkında not ekle (sadece adminler görür)..."
                                                        value={supportNotes[act.id] ?? ''}
                                                        onChange={e => setSupportNotes(prev => ({ ...prev, [act.id]: e.target.value }))}
                                                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all resize-none"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveNote(act.id, act.id.replace('sup-', ''))}
                                                        disabled={savingNote === act.id || !supportNotes[act.id]?.trim()}
                                                        className="px-3 rounded-xl bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 flex items-center justify-center"
                                                        title="Notu Kaydet"
                                                    >
                                                        <Send size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col sm:flex-row items-stretch gap-2">
                                                {act.phone && (
                                                    <a
                                                        href={`https://wa.me/${act.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Merhaba, destek talebiniz hakkında görüşmek istiyoruz.`)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                        WhatsApp
                                                    </a>
                                                )}
                                                {act.phone && (
                                                    <a
                                                        href={`tel:${act.phone}`}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                                    >
                                                        <Phone size={14} />
                                                        Ara
                                                    </a>
                                                )}
                                                {act.clinicSlug && (
                                                    <button
                                                        onClick={() => window.open(`/${act.clinicSlug}`, '_blank')}
                                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                                    >
                                                        <ExternalLink size={14} />
                                                        Panel
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteActivity(act)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                                                >
                                                    <CheckCircle size={14} />
                                                    Çözüldü
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Archive Section */}
                    {showArchive && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 px-1">
                                <RotateCcw size={13} className="text-slate-400" />
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Arşiv — Çözülmüş Talepler ({archivedActivities.length})
                                </h4>
                            </div>
                            <div className="bg-slate-50 rounded-[2rem] border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                                {archivedActivities.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Arşivde kayıt yok.</p>
                                    </div>
                                ) : archivedActivities.map(act => (
                                    <div key={act.id} className="p-4 flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
                                        <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                            <CheckCircle size={15} className="text-emerald-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-slate-700 truncate">{act.detail}</p>
                                            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">
                                                {format(act.time, 'd MMM yyyy, HH:mm', { locale: tr })}
                                            </p>
                                        </div>
                                        {act.clinicSlug && (
                                            <a
                                                href={`/${act.clinicSlug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                                            >
                                                <ExternalLink size={13} />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6 md:space-y-8">
                    {/* Churn Risk */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <TrendingDown size={14} className="text-rose-500" /> Kayıp Riski
                            </h3>
                            <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full uppercase">Kritik</span>
                        </div>

                        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-5 md:p-6 space-y-3">
                            {churnClinics.length === 0 ? (
                                <p className="text-[10px] font-bold text-slate-400 text-center py-4">Risk bulunmuyor.</p>
                            ) : (
                                churnClinics.map((c) => (
                                    <div key={c.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-800 truncate">{c.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                    Son aktif: {format(new Date(c.last_active_at), 'd MMM yyyy', { locale: tr })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {c.slug && (
                                                <a
                                                    href={`/${c.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border border-slate-200 bg-white text-[9px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all"
                                                >
                                                    <ExternalLink size={10} /> Panel
                                                </a>
                                            )}
                                            {c.phone && (
                                                <a
                                                    href={`https://wa.me/${c.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Merhaba! Sizi bir süredir göremedik, yardımcı olabilir miyiz?')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
                                                >
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                    WP
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Ödeme Sorunları (Dunning) */}
                    {dunningClinics.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <CardIcon size={14} className="text-rose-500" /> Ödeme Sorunları
                                </h3>
                                <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase animate-pulse">
                                    {dunningClinics.length} Klinik
                                </span>
                            </div>
                            <div className="bg-white rounded-[2rem] border border-rose-100 shadow-xl shadow-rose-50 p-5 space-y-3">
                                {dunningClinics.map((c) => {
                                    const days = c.dunning_started_at ? daysSince(c.dunning_started_at) : 0;
                                    const action = c.dunning_started_at
                                        ? getDunningAction(c.dunning_started_at, c.retry_count ?? 0)
                                        : null;
                                    const waMessage = action && action.type !== 'skip'
                                        ? action.message.whatsapp
                                        : '💳 NextGency OS: Abonelik ödemesinde sorun yaşanıyor. Lütfen kart bilgilerinizi güncelleyin: {link}';
                                    const isRestricted = c.subscription_status === 'restricted';

                                    return (
                                        <div key={c.id} className={`rounded-2xl border p-3 space-y-2 ${isRestricted ? 'border-rose-200 bg-rose-50' : 'border-amber-100 bg-amber-50'}`}>
                                            <div className="flex items-start gap-2 min-w-0">
                                                <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${isRestricted ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-slate-800 truncate">{c.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${isRestricted ? 'bg-rose-200 text-rose-700' : 'bg-amber-200 text-amber-700'}`}>
                                                            {isRestricted ? 'Kısıtlı' : 'Ödeme Bek.'}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-500">
                                                            {days} gün gecikme
                                                        </span>
                                                        {(c.retry_count ?? 0) > 0 && (
                                                            <span className="text-[9px] font-bold text-slate-400">
                                                                {c.retry_count}× denendi
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5">
                                                {c.slug && (
                                                    <a
                                                        href={`/${c.slug}/admin/subscription`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border border-slate-200 bg-white text-[9px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all"
                                                    >
                                                        <ExternalLink size={10} /> Panel
                                                    </a>
                                                )}
                                                {c.phone && (
                                                    <a
                                                        href={buildWhatsAppUrl(c.phone, waMessage, c.slug ?? '')}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-white text-[9px] font-black uppercase tracking-widest transition-all ${isRestricted ? 'bg-rose-500 hover:bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                                                    >
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                        WP
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Support Card */}
                    <div className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 md:p-6 opacity-10">
                            <LifeBuoy size={100} />
                        </div>
                        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-emerald-400 mb-4">Platform Sağlığı</h4>
                        <p className="text-xs md:text-sm font-medium leading-relaxed mb-6 opacity-80 text-slate-300">
                            Okunmamış talepler ve canlı trafik ile operasyonu buradan yönetin.
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <Users size={16} />
                            </div>
                            <div>
                                <p className="text-base md:text-lg font-black leading-none">{stats.activeSubscriptions}</p>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Abone</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MetricCard({ title, value, icon, trend, isAlert, subtitle }: any) {
    return (
        <div className={`bg-white p-4 md:p-6 rounded-[1.8rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group border-b-4 ${isAlert ? 'border-b-rose-400' : 'border-b-transparent hover:border-b-emerald-400'} transition-all duration-500`}>
            <div className="flex items-start justify-between mb-2 md:mb-4">
                <div className="p-2 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 text-slate-600">
                    {icon}
                </div>
                <span className={`text-[8px] md:text-[9px] font-black px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg uppercase tracking-tight ${isAlert ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                    {trend}
                </span>
            </div>
            <div className="min-w-0">
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{title}</p>
                <h4 className="text-xl md:text-3xl font-black text-slate-900 mt-0.5 md:mt-1 tracking-tight truncate">{value}</h4>
                {subtitle && <p className="text-[8px] md:text-[9px] font-bold text-slate-400 mt-1 md:mt-2 uppercase truncate">{subtitle}</p>}
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BuildingIcon({ className, size = 20 }: any) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="10" width="20" height="12" rx="2" ry="2" />
            <path d="M7 22V7a2 2 0 012-2h6a2 2 0 012 2v15" />
            <path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
        </svg>
    );
}

