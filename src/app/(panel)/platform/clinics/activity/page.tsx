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
    Trash2,
    CheckCircle,
    RotateCcw,
    ExternalLink,
    Banknote,
    Waves
} from "lucide-react";

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
    const [showArchived, setShowArchived] = useState(false);
    const [stats, setStats] = useState({
        totalClinics: 0,
        activeSubscriptions: 0,
        trialClinics: 0,
        expiringSoon: 0,
        todayAppointments: 0,
        todayPatients: 0,
        mrr: 0,
        liveActive: 0
    });

    const [activities, setActivities] = useState<Activity[]>([]);
    const [churnClinics, setChurnClinics] = useState<any[]>([]);
    const [expandedSupportId, setExpandedSupportId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        const today = startOfDay(new Date()).toISOString();
        const startThreshold = showArchived ? subDays(new Date(), 30).toISOString() : subDays(new Date(), 7).toISOString();
        const oneHourAgo = subMinutes(new Date(), 60).toISOString();

        // --- 1. platform data fetching ---
        const { data: allClinics } = await supabase.from("clinics")
            .select("id, name, subscription_status, billing_cycle, current_period_end, last_active_at, created_at");

        const [apptRes, patientRes] = await Promise.all([
            supabase.from("appointments").select("*", { count: 'exact', head: true }).gte("created_at", today),
            supabase.from("patients").select("*", { count: 'exact', head: true }).gte("created_at", today)
        ]);

        if (allClinics) {
            let totalMRR = 0;
            let liveActiveCount = 0;
            let expiringSoonCount = 0;
            let trialCount = 0;
            let activeSubCount = 0;

            const now = new Date();
            const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            allClinics.forEach(c => {
                // MRR Logic: 1199 for monthly, 999 for annual
                if (c.subscription_status === 'active') {
                    activeSubCount++;
                    if (c.billing_cycle === 'annual') totalMRR += 999;
                    else if (c.billing_cycle === 'monthly') totalMRR += 1199;
                }
                if (c.subscription_status === 'trialing') trialCount++;

                // Live Active (last 60 mins)
                if (c.last_active_at && new Date(c.last_active_at) > new Date(oneHourAgo)) {
                    liveActiveCount++;
                }

                // Expiring soon (next 7 days)
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
        const { data: riskyClinics } = await supabase.from("clinics")
            .select("id, name, last_active_at, subscription_status")
            .lt("last_active_at", sevenDaysAgo)
            .order("last_active_at", { ascending: true })
            .limit(3);
        setChurnClinics(riskyClinics || []);

        // --- 4. Activity Feed ---
        // Registrations
        let clinicQuery = supabase.from("clinics")
            .select("id, name, slug, created_at, city, district, subscription_status, phone")
            .order("created_at", { ascending: false });
        if (!showArchived) clinicQuery = clinicQuery.gte("created_at", startThreshold);
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
                location: (c as any).city ? `${(c as any).city} / ${(c as any).district || ''}` : undefined,
                phone: (c as any).phone,
                clinicId: c.id,
                clinicSlug: c.slug
            }));

        // Payments
        let paymentQuery = supabase.from("payment_history")
            .select("id, amount, package_name, created_at, clinics(id, name, slug, city, district)")
            .order("created_at", { ascending: false });
        if (!showArchived) paymentQuery = paymentQuery.gte("created_at", startThreshold);
        const { data: recentPayments } = await paymentQuery.limit(20);

        const paymentActivities: Activity[] = (recentPayments || [])
            .filter(p => !dismissedIds.has(`pay-${p.id}`))
            .map(p => ({
                id: `pay-${p.id}`,
                type: 'subscription',
                title: 'Ödeme Alındı',
                detail: `${(p.clinics as any)?.name || 'Bilinmeyen Klinik'} - ${p.package_name} paketi ödemesi tamamlandı.`,
                time: new Date(p.created_at),
                status: 'info',
                location: (p.clinics as any)?.city ? `${(p.clinics as any).city} / ${(p.clinics as any).district || ''}` : undefined,
                clinicId: (p.clinics as any)?.id,
                clinicSlug: (p.clinics as any)?.slug
            }));

        // Support
        let supportQuery = supabase.from("platform_support_requests")
            .select("*, clinics(id, name, slug, city, district, phone)")
            .order("created_at", { ascending: false });
        if (!showArchived) supportQuery = supportQuery.eq("is_archived", false);
        const { data: recentSupport } = await supportQuery.limit(20);

        const supportActivities: Activity[] = (recentSupport || []).map(s => ({
            id: `sup-${s.id}`,
            type: 'support',
            title: s.is_archived ? 'Çözülmüş Destek Talebi' : 'Destek Talebi',
            detail: `${(s.clinics as any)?.name || 'Bilinmeyen Klinik'} - Konu: ${s.subject}`,
            time: new Date(s.created_at),
            status: s.is_archived ? 'success' : (s.priority === 'urgent' || s.priority === 'high' ? 'error' : 'warning'),
            message: s.message,
            priority: s.priority,
            location: (s.clinics as any)?.city ? `${(s.clinics as any).city} / ${(s.clinics as any).district || ''}` : undefined,
            phone: (s.clinics as any)?.phone,
            isSupport: true,
            clinicId: (s.clinics as any)?.id,
            clinicSlug: (s.clinics as any)?.slug
        }));

        const merged = [...registrationActivities, ...paymentActivities, ...supportActivities]
            .sort((a, b) => b.time.getTime() - a.time.getTime());
        setActivities(merged);
        setLoading(false);
    }, [showArchived]);

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

    const toggleFilter = (filterId: string) => {
        setActiveFilters(prev =>
            prev.includes(filterId)
                ? prev.filter(id => id !== filterId)
                : [...prev, filterId]
        );
    };

    const filteredActivities = useMemo(() => {
        if (activeFilters.length === 0) return activities;
        return activities.filter(act => activeFilters.includes(act.type));
    }, [activeFilters, activities]);

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
                    title="Platform Geliri"
                    value={`${stats.mrr.toLocaleString("tr-TR")} ₺`}
                    icon={<Banknote className="text-emerald-500" />}
                    trend="Aylık"
                    subtitle="Aboneliklerden"
                />
                <MetricCard title="TOPLAM" value={stats.totalClinics} icon={<BuildingIcon className="text-blue-500" />} trend="Klinik" />
                <MetricCard title="DENEME" value={stats.trialClinics} icon={<Clock className="text-amber-500" />} trend="Ücretsiz" />
                <MetricCard title="KRİTİK" value={stats.expiringSoon} icon={<AlertTriangle className="text-rose-500" />} trend="Bitiş" isAlert={stats.expiringSoon > 0} />
            </div>

            {/* Modern Filters Toolbar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 pb-2">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-2 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/40 w-full md:w-auto">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center shrink-0 gap-2 px-4 py-3 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${showArchived ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'
                            }`}
                    >
                        <RotateCcw size={14} />
                        {showArchived ? 'Arşiv Kapat' : 'Arşiv'}
                    </button>
                    <div className="h-6 w-[1px] bg-slate-200 mx-3 shrink-0" />
                    {filters.map((f) => {
                        const isActive = activeFilters.includes(f.id);
                        return (
                            <button
                                key={f.id}
                                onClick={() => toggleFilter(f.id)}
                                className={`flex items-center shrink-0 gap-2 px-4 md:px-6 py-3 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                                    ? `bg-slate-900 text-white shadow-lg`
                                    : `bg-white text-slate-500 border border-slate-100`
                                    }`}
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
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[11px] md:text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={16} className="text-slate-400 shrink-0" />
                                <span className="truncate">{showArchived ? 'Geçmiş (30 G)' : 'Aktivite Akışı'}</span>
                            </h3>
                            {!showArchived && activities.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="hidden sm:block text-[9px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-rose-100 transition-colors"
                                >
                                    Temizle
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {!showArchived && activities.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="sm:hidden text-[9px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full uppercase truncate max-w-[80px]"
                                >
                                    Sil
                                </button>
                            )}
                            <button onClick={loadData} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Yenile</button>
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
                                                    {act.isSupport && !showArchived && (
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
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                            )}
                                            {!showArchived && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteActivity(act); }}
                                                    className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all"
                                                >
                                                    <CheckCircle size={16} />
                                                </button>
                                            )}
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
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageSquare size={14} className="text-slate-400" />
                                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Talep Mesajı</span>
                                                </div>
                                                <p className="text-xs md:text-[13px] text-slate-700 font-bold leading-relaxed bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                    {act.message}
                                                </p>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                                <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                            <Phone size={16} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">İletişim</p>
                                                            <p className="text-[11px] md:text-xs font-black text-slate-900 mt-1 truncate">{act.phone || "---"}</p>
                                                        </div>
                                                    </div>
                                                    {act.phone && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); window.open(`tel:${act.phone}`); }}
                                                            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-2"
                                                        >
                                                            ARA
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex flex-row sm:justify-end gap-2">
                                                    {act.clinicSlug && (
                                                        <button
                                                            onClick={() => window.open(`/${act.clinicSlug}`, '_blank')}
                                                            className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <ExternalLink size={14} />
                                                            PANEL
                                                        </button>
                                                    )}
                                                    {!showArchived && (
                                                        <button
                                                            onClick={() => handleDeleteActivity(act)}
                                                            className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <CheckCircle size={14} />
                                                            ÇÖZÜLDÜ
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
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

                        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-5 md:p-6 space-y-4">
                            {churnClinics.length === 0 ? (
                                <p className="text-[10px] font-bold text-slate-400 text-center py-4">Risk bulunmuyor.</p>
                            ) : (
                                churnClinics.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between group">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[11px] md:text-xs font-black text-slate-800 truncate">{c.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">
                                                    {format(new Date(c.last_active_at), 'd MMM', { locale: tr })}
                                                </p>
                                            </div>
                                        </div>
                                        <button className="text-[9px] font-black text-indigo-600 uppercase">Ara</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

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

function BuildingIcon({ className, size = 20 }: any) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="10" width="20" height="12" rx="2" ry="2" />
            <path d="M7 22V7a2 2 0 012-2h6a2 2 0 012 2v15" />
            <path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
        </svg>
    );
}

