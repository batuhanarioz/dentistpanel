"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
    format,
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    eachDayOfInterval,
    isSameDay,
    isToday,
    addDays,
    subDays,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
    startOfDay,
    endOfDay,
    differenceInMinutes,
    getHours,
    getMinutes,
    parseISO
} from "date-fns";
import { tr } from "date-fns/locale";

// --- Types ---

type ViewType = 'day' | 'week' | 'month';
type DisplayMode = 'grid' | 'list';

type CalendarEvent = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    status: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
    patientName: string;
    doctorName: string;
    doctorId: string | null;
    treatmentType: string | null;
    channel: string;
    phone?: string;
};

type AppointmentDB = {
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    treatment_type: string | null;
    channel: string;
    patient_id: string;
    doctor_id: string | null;
};

type Doctor = {
    id: string;
    full_name: string;
};

type WorkingHours = {
    [key: string]: {
        open: string;
        close: string;
        enabled: boolean;
    };
};

const DEFAULT_WORKING_HOURS: WorkingHours = {
    monday: { open: "09:00", close: "19:00", enabled: true },
    tuesday: { open: "09:00", close: "19:00", enabled: true },
    wednesday: { open: "09:00", close: "19:00", enabled: true },
    thursday: { open: "09:00", close: "19:00", enabled: true },
    friday: { open: "09:00", close: "19:00", enabled: true },
    saturday: { open: "09:00", close: "14:00", enabled: false },
    sunday: { open: "09:00", close: "14:00", enabled: false },
};

const statusStyles: Record<string, string> = {
    pending: "bg-amber-50 border-l-amber-400 text-amber-900 hover:bg-amber-100",
    confirmed: "bg-emerald-50 border-l-emerald-500 text-emerald-900 hover:bg-emerald-100",
    completed: "bg-blue-50 border-l-blue-500 text-blue-900 hover:bg-blue-100",
    cancelled: "bg-rose-50 border-l-rose-400 text-rose-900 hover:bg-rose-100 opacity-60",
    no_show: "bg-rose-50 border-l-rose-700 text-rose-900 hover:bg-rose-100 grayscale",
};

const channelMap: Record<string, string> = {
    web: "Web",
    whatsapp: "WhatsApp",
    phone: "Telefon",
    walk_in: "Yüz yüze",
};

const statusMap: Record<string, { label: string; class: string }> = {
    confirmed: { label: "Planlandı", class: "bg-blue-100 text-blue-700 border-blue-200" },
    completed: { label: "Tamamlandı", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    pending: { label: "Onay Bekliyor", class: "bg-amber-100 text-amber-700 border-amber-200" },
    cancelled: { label: "İptal", class: "bg-rose-100 text-rose-700 border-rose-200" },
    no_show: { label: "Gelmedi", class: "bg-rose-100 text-rose-700 border-rose-200" },
};

const channelBadgeClass: Record<string, string> = {
    WhatsApp: "bg-green-50 text-green-700 border-green-200",
    Web: "bg-sky-50 text-sky-700 border-sky-200",
    Telefon: "bg-violet-50 text-violet-700 border-violet-200",
    "Yüz yüze": "bg-orange-50 text-orange-700 border-orange-200",
};

interface CalendarViewProps {
    clinicId: string;
    initialView?: ViewType;
    initialDisplayMode?: DisplayMode;
}

export default function CalendarView({ clinicId, initialView = 'week', initialDisplayMode = 'grid' }: CalendarViewProps) {
    // --- State ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<ViewType>(initialView);
    const [displayMode, setDisplayMode] = useState<DisplayMode>(initialDisplayMode);
    const [events, setEvents] = useState<CalendarEvent[]>([]);

    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | "all">("all");

    const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
    const [startHour] = useState(8);
    const [endHour] = useState(20);

    const [loading, setLoading] = useState(false);
    const searchParams = useSearchParams();
    const appointmentIdParam = searchParams.get("appointmentId");

    // --- Helpers for Date Ranges ---

    const dateRange = useMemo(() => {
        if (view === 'day') {
            return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
        } else if (view === 'week') {
            return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
        } else {
            return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
        }
    }, [currentDate, view]);

    const gridDays = useMemo(() => {
        return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    }, [dateRange]);

    // --- Initial Fetch: Config & Doctors ---

    useEffect(() => {
        async function fetchData() {
            // 1. Working Hours
            if (clinicId) {
                const { data: clinic } = await supabase.from('clinics').select('working_hours').eq('id', clinicId).single();
                if (clinic?.working_hours) {
                    setWorkingHours(clinic.working_hours as WorkingHours);
                }
            }

            // 2. Doctors
            const { data: users } = await supabase
                .from('users')
                .select('id, full_name')
                .in('role', ['DOCTOR']);

            if (users) setDoctors(users);
        }
        fetchData();
    }, [clinicId]);

    // --- Fetch Events ---

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("appointments")
                .select(`
          id, starts_at, ends_at, status, treatment_type, channel, 
          patient_id, doctor_id
        `)
                .gte("starts_at", startOfDay(dateRange.start).toISOString())
                .lt("starts_at", endOfDay(dateRange.end).toISOString())
                .order("starts_at", { ascending: true }); // Ordered for list view

            if (selectedDoctorId !== "all") {
                query = query.eq("doctor_id", selectedDoctorId);
            }

            const { data: appointmentsRaw, error } = await query;
            if (error) throw error;

            if (!appointmentsRaw || appointmentsRaw.length === 0) {
                setEvents([]);
                return;
            }

            // Bulk Fetch Details
            const patientIds = Array.from(new Set(appointmentsRaw.map((a) => a.patient_id).filter(Boolean)));
            const doctorIds = Array.from(new Set(appointmentsRaw.map((a) => a.doctor_id).filter(Boolean)));

            const [patientsRes, doctorsRes] = await Promise.all([
                patientIds.length > 0 ? supabase.from("patients").select("id, full_name, phone").in("id", patientIds) : { data: [] },
                doctorIds.length > 0 ? supabase.from("users").select("id, full_name").in("id", doctorIds) : { data: [] }
            ]);

            const patientsMap = Object.fromEntries((patientsRes.data || []).map((p) => [p.id, p]));
            const doctorsMap = Object.fromEntries((doctorsRes.data || []).map((d) => [d.id, d.full_name]));

            const formatted: CalendarEvent[] = (appointmentsRaw as unknown as AppointmentDB[]).map(appt => ({
                id: appt.id,
                title: "",
                start: parseISO(appt.starts_at),
                end: parseISO(appt.ends_at),
                status: appt.status as CalendarEvent["status"],
                treatmentType: appt.treatment_type,
                channel: appt.channel,
                patientName: patientsMap[appt.patient_id]?.full_name || "Bilinmiyor",
                phone: patientsMap[appt.patient_id]?.phone,
                doctorId: appt.doctor_id,
                doctorName: (appt.doctor_id && doctorsMap[appt.doctor_id]) || "Atanmadı"
            }));

            setEvents(formatted);
        } catch (err) {
            console.error("Fetch Events Error:", err);
        } finally {
            setLoading(false);
        }
    }, [dateRange, selectedDoctorId]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // --- Auto-select appointment from URL ---
    useEffect(() => {
        if (appointmentIdParam && events.length > 0) {
            const found = events.find(e => e.id === appointmentIdParam);
            if (found) {
                setSelectedEvent(found);
                // Eğer gün/hafta dışındaysa o tarihe götür
                if (!isSameDay(currentDate, found.start)) {
                    setCurrentDate(found.start);
                }
            }
        }
    }, [appointmentIdParam, events, currentDate]);

    // --- Stats Logic ---
    const stats = useMemo(() => {
        const total = events.length;
        const active = events.filter(e => e.status !== "cancelled" && e.status !== "no_show").length;
        const completed = events.filter(e => e.status === "completed").length;
        const cancelled = events.filter(e => e.status === "cancelled" || e.status === "no_show").length;

        return { total, active, completed, cancelled };
    }, [events]);


    // --- Navigation Handlers ---

    const handlePrev = () => {
        if (view === 'day') setCurrentDate(d => subDays(d, 1));
        else if (view === 'week') setCurrentDate(d => subWeeks(d, 1));
        else setCurrentDate(d => subMonths(d, 1));
    };

    const handleNext = () => {
        if (view === 'day') setCurrentDate(d => addDays(d, 1));
        else if (view === 'week') setCurrentDate(d => addWeeks(d, 1));
        else setCurrentDate(d => addMonths(d, 1));
    };

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
    };

    // --- Render Helpers ---

    const hours = useMemo(() => Array.from({ length: endHour - startHour }, (_, i) => startHour + i), [startHour, endHour]);
    const CELL_HEIGHT = 80;

    const getEventStyle = (start: Date, end: Date) => {
        const startMin = getHours(start) * 60 + getMinutes(start);
        const dayStartMin = startHour * 60;
        const durationMin = differenceInMinutes(end, start);

        return {
            top: `${((startMin - dayStartMin) / 60) * CELL_HEIGHT}px`,
            height: `${(durationMin / 60) * CELL_HEIGHT}px`,
        };
    };

    const dateLabel = useMemo(() => {
        if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: tr });
        if (view === 'day') return format(currentDate, 'd MMMM yyyy, EEEE', { locale: tr });
        return `${format(dateRange.start, 'd MMM', { locale: tr })} - ${format(dateRange.end, 'd MMM yyyy', { locale: tr })}`;
    }, [view, currentDate, dateRange]);

    // --- Header Component ---
    const Header = () => (
        <div className="flex flex-col bg-white border-b border-slate-100">

            {/* Mobile Design */}
            <div className="flex flex-col md:hidden p-4 gap-4">
                {/* Row 1: Date & Nav */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">{dateLabel}</h2>
                    <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
                        <button onClick={handlePrev} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-2 text-xs font-semibold hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                            Bugün
                        </button>
                        <button onClick={handleNext} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>
                </div>

                {/* Row 2: Controls Grid */}
                <div className="grid grid-cols-[1fr_auto] gap-2">
                    {/* Doctor Select */}
                    <div className="relative">
                        <select
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-8 py-2 font-medium"
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                        >
                            <option value="all">Tüm Doktorlar</option>
                            {doctors.map(d => (
                                <option key={d.id} value={d.id}>{d.full_name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>

                    {/* List/Grid Toggle (Icon Only) */}
                    <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                        <button onClick={() => setDisplayMode('list')} className={`p-1.5 rounded ${displayMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <button onClick={() => setDisplayMode('grid')} className={`p-1.5 rounded ${displayMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" /></svg>
                        </button>
                    </div>
                </div>

                {/* Row 3: View Toggles (Full Width) */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {(['day', 'week', 'month'] as ViewType[]).map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {v === 'day' ? 'Gün' : v === 'week' ? 'Hafta' : 'Ay'}
                        </button>
                    ))}
                </div>
            </div>


            {/* Desktop Design */}
            <div className="hidden md:flex md:flex-row md:items-center justify-between px-6 py-4 gap-4">
                {/* Date & Nav */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                        <button onClick={handlePrev} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 text-sm font-medium hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                            Bugün
                        </button>
                        <button onClick={handleNext} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </button>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight min-w-[200px]">
                        {dateLabel}
                    </h2>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Doctor Filter */}
                    <div className="relative w-full sm:w-auto">
                        <select
                            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-8 py-2 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                            value={selectedDoctorId}
                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                        >
                            <option value="all">Tüm Doktorlar</option>
                            {doctors.map(d => (
                                <option key={d.id} value={d.id}>{d.full_name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>

                    {/* Display Mode Toggle */}
                    <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-100/50">
                        <button
                            onClick={() => setDisplayMode('list')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${displayMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            <span className="hidden sm:inline">Liste</span>
                        </button>
                        <button
                            onClick={() => setDisplayMode('grid')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${displayMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" /></svg>
                            <span className="hidden sm:inline">Izgara</span>
                        </button>
                    </div>

                    {/* View Toggle */}
                    <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-100/50">
                        {(['day', 'week', 'month'] as ViewType[]).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {v === 'day' ? 'Gün' : v === 'week' ? 'Hafta' : 'Ay'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full gap-4 relative">
            {/* --- EVENT DETAILS SIDEBAR --- */}
            {selectedEvent && (
                <>
                    <style jsx global>{`
                      @keyframes slideIn {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                      }
                      .animate-slide-in {
                        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                      }
                    `}</style>
                    <div
                        className="fixed inset-0 z-[40] bg-slate-900/20 backdrop-blur-[2px] transition-opacity"
                        onClick={() => setSelectedEvent(null)}
                    ></div>

                    <div className="fixed inset-y-0 right-0 z-[50] w-full max-w-md bg-white shadow-2xl border-l border-slate-100 flex flex-col animate-slide-in">
                        {/* Sidebar Header */}
                        <div className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col gap-2">
                            <div className="flex items-start justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Randevu Detayı</span>
                                    <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedEvent.patientName}</h3>
                                </div>
                                <button onClick={() => setSelectedEvent(null)} className="p-2 -mr-2 text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 rounded-full transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusMap[selectedEvent.status]?.class}`}>
                                    {statusMap[selectedEvent.status]?.label}
                                </span>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${channelBadgeClass[selectedEvent.channel] || "bg-slate-100"}`}>
                                    {selectedEvent.channel}
                                </span>
                            </div>
                        </div>

                        {/* Sidebar Content */}
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            {/* Time & Date */}
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900">Zaman</h4>
                                    <p className="text-sm text-slate-600 mt-0.5">
                                        {format(selectedEvent.start, 'd MMMM yyyy, EEEE', { locale: tr })}
                                        <br />
                                        <span className="font-medium text-slate-900">{format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Doctor */}
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900">Doktor</h4>
                                    <p className="text-sm text-slate-600 mt-0.5">
                                        {selectedEvent.doctorName || "Hekim Atanmadı"}
                                    </p>
                                </div>
                            </div>

                            {/* Phone */}
                            {selectedEvent.phone && (
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-900">İletişim</h4>
                                        <p className="text-sm text-slate-600 mt-0.5 flex flex-col">
                                            <span>{selectedEvent.phone}</span>
                                            <a href={`https://wa.me/${selectedEvent.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline mt-1 font-medium inline-flex items-center gap-1">
                                                WhatsApp ile İletişime Geç
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Treatment (Placeholder) */}
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900">Tedavi Tipi</h4>
                                    <p className="text-sm text-slate-600 mt-0.5">
                                        {selectedEvent.treatmentType || "Genel Muayene"}
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Sidebar Footer (Actions) */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button onClick={() => setSelectedEvent(null)} className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm active:scale-[0.98]">
                                Kapat
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* --- STATISTICS CARDS --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total Card */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 font-medium">Toplam Randevu</p>
                            <p className="text-lg font-bold text-slate-900">{loading ? "..." : stats.total}</p>
                        </div>
                    </div>
                </div>
                {/* Active Card */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 font-medium">Aktif</p>
                            <p className="text-lg font-bold text-emerald-700">{loading ? "..." : stats.active}</p>
                        </div>
                    </div>
                </div>
                {/* Completed Card */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-sm">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 font-medium">Tamamlanan</p>
                            <p className="text-lg font-bold text-blue-700">{loading ? "..." : stats.completed}</p>
                        </div>
                    </div>
                </div>
                {/* Cancelled Card */}
                <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-sm">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 font-medium">İptal</p>
                            <p className="text-lg font-bold text-rose-700">{loading ? "..." : stats.cancelled}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN CALENDAR CONTENT --- */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                <Header />

                {/* --- LIST VIEW --- */}
                {displayMode === 'list' && (
                    <div className="flex-1 overflow-auto custom-scrollbar bg-white">
                        <div className="min-w-[640px]">
                            {/* List Header */}
                            <div className="grid grid-cols-[1fr_1.2fr_1fr_1.2fr] gap-4 items-center px-5 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-[5]">
                                <span>Saat</span>
                                <span>Hasta</span>
                                <span>Doktor</span>
                                <span>Durum & Kanal</span>
                            </div>

                            {/* List Body */}
                            <div className="divide-y divide-slate-100">
                                {loading && (
                                    <div className="px-5 py-8 text-center text-slate-500 text-sm">Yükleniyor...</div>
                                )}

                                {!loading && events.length === 0 && (
                                    <div className="px-5 py-12 text-center text-slate-500">
                                        <p>Bu tarih aralığında randevu bulunamadı.</p>
                                    </div>
                                )}

                                {!loading && events.map(event => {
                                    const timeRange = `${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`;
                                    const statusInfo = statusMap[event.status] || { label: "Bilinmiyor", class: "bg-gray-100" };
                                    const channelClass = channelBadgeClass[channelMap[event.channel]] || channelBadgeClass[event.channel] || "bg-slate-100 text-slate-600";
                                    const channelLabel = channelMap[event.channel] || event.channel;

                                    return (
                                        <div key={event.id} onClick={() => handleEventClick(event)} className="grid grid-cols-[1fr_1.2fr_1fr_1.2fr] gap-4 items-center px-5 py-3.5 transition-all hover:bg-slate-50/80 group cursor-pointer">
                                            {/* Time */}
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-semibold text-slate-900 block">{timeRange}</span>
                                                    <span className="text-[10px] text-slate-400 block">{format(event.start, 'd MMM, EEE', { locale: tr })}</span>
                                                </div>
                                            </div>

                                            {/* Patient */}
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white shadow-sm shrink-0">
                                                    {event.patientName[0]?.toUpperCase() ?? "H"}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                                                        {event.patientName}
                                                    </span>
                                                    {event.phone && (
                                                        <span className="text-[11px] text-slate-400 truncate">{event.phone}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Doctor */}
                                            <div className="flex items-center gap-2 min-w-0">
                                                <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                                <span className="text-sm text-slate-700 truncate">
                                                    {event.doctorName}
                                                </span>
                                            </div>

                                            {/* Status/Channel */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold border ${statusInfo.class}`}>
                                                    {statusInfo.label}
                                                </span>
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${channelClass}`}>
                                                    {channelLabel}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- GRID VIEW --- */}
                {displayMode === 'grid' && (
                    <div className="flex-1 overflow-auto custom-scrollbar relative bg-white mt-6">

                        {/* MONTH VIEW */}
                        {view === 'month' && (
                            <div className="grid grid-cols-7 h-full auto-rows-fr">
                                {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(day => (
                                    <div key={day} className="p-2 text-center text-xs font-semibold text-slate-400 uppercase border-b border-r border-slate-100 last:border-r-0">
                                        {day}
                                    </div>
                                ))}
                                {gridDays.map((day, i) => {
                                    const dayEvents = events.filter(e => isSameDay(e.start, day));
                                    const isTodayFlag = isToday(day);
                                    return (
                                        <div key={i} className="@container min-h-[100px] border-b border-r border-slate-100 p-1 relative group hover:bg-slate-50/30 last:border-r-0">
                                            <div className={`text-xs ml-1 font-medium w-6 h-6 flex items-center justify-center rounded-full ${isTodayFlag ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                                                {format(day, 'd')}
                                            </div>
                                            <div className="mt-1 space-y-1">
                                                {dayEvents.slice(0, 3).map(e => (
                                                    <div onClick={(ev) => { ev.stopPropagation(); handleEventClick(e); }} key={e.id} className={`cursor-pointer text-[10px] truncate px-1.5 py-0.5 rounded border-l-2 ${statusStyles[e.status]?.split(' ')[0]} border-${statusStyles[e.status]?.split('-')[2]}-400 hover:brightness-95`}>
                                                        {format(e.start, 'HH:mm')} {e.patientName}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <div className="text-[10px] text-slate-400 pl-1">
                                                        + {dayEvents.length - 3} daha
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* DAY & WEEK VIEW */}
                        {(view === 'week' || view === 'day') && (
                            <div className="min-w-[800px] relative">
                                {/* Header: Days - Compact Height */}
                                <div className={`grid ${view === 'day' ? 'grid-cols-[60px_1fr]' : 'grid-cols-[60px_repeat(7,1fr)]'} bg-slate-50 border-b border-slate-200 sticky top-0 z-[5]`}>
                                    {/* Time Col Header - Sticky Corner */}
                                    <div className="p-2 border-r border-slate-200 bg-slate-50 sticky left-0 z-[10]"></div>

                                    {gridDays.map((day, i) => (
                                        <div key={i} className={`p-2 border-r border-slate-100 last:border-r-0 flex items-center justify-start gap-2 ${isToday(day) ? 'bg-indigo-50/30' : ''}`}>
                                            <div className={`w-7 h-7 flex flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${isToday(day) ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700'}`}>
                                                {format(day, 'd')}
                                            </div>
                                            <span className={`text-xs font-medium uppercase tracking-wider ${isToday(day) ? 'text-indigo-600' : 'text-slate-500'}`}>
                                                {format(day, 'EEEE', { locale: tr })}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Timetable Body */}
                                <div className={`grid ${view === 'day' ? 'grid-cols-[60px_1fr]' : 'grid-cols-[60px_repeat(7,1fr)]'} relative`}>
                                    {/* Time Col left */}
                                    <div className="border-r border-slate-100 bg-white z-[5] sticky left-0">
                                        {hours.map(hour => (
                                            <div key={hour} className="text-right pr-3 text-xs font-medium text-slate-400 text-opacity-80 relative" style={{ height: `${CELL_HEIGHT}px` }}>
                                                <span className="relative -top-2.5 bg-white pl-1">{String(hour).padStart(2, '0')}:00</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Background Lines */}
                                    <div className="col-start-2 col-end-[-1] absolute inset-0 z-0 pointer-events-none">
                                        {hours.map((_, i) => (
                                            <div key={i} className="border-b border-slate-100" style={{ height: `${CELL_HEIGHT}px` }}></div>
                                        ))}
                                        {/* Vertical Lines */}
                                        <div className="absolute inset-0 flex">
                                            {gridDays.map((d, i) => {
                                                const dayName = format(d, 'EEEE').toLowerCase();
                                                const isClosed = workingHours[dayName] && !workingHours[dayName].enabled;

                                                return (
                                                    <div key={i} className={`flex-1 border-r border-slate-50 last:border-r-0 h-full ${isClosed ? 'bg-slate-50/50' : ''}`}></div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Events */}
                                    {gridDays.map((day, colIndex) => {
                                        const dayEvents = events.filter(e => isSameDay(e.start, day));
                                        return (
                                            <div key={colIndex} className="relative z-[1] h-full border-r border-slate-100/0 last:border-r-0">
                                                <div className="absolute inset-0 hover:bg-slate-50/30 transition-colors pointer-events-none"></div>

                                                {dayEvents.map(event => {
                                                    const style = getEventStyle(event.start, event.end);
                                                    const colorClass = statusStyles[event.status] || "bg-slate-100 border-l-slate-400 text-slate-700";

                                                    return (
                                                        <div
                                                            key={event.id}
                                                            onClick={(ev) => { ev.stopPropagation(); handleEventClick(event); }}
                                                            className={`absolute left-1 right-1 rounded-md border-l-[3px] p-2 text-xs shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:z-[2] hover:scale-[1.02] overflow-hidden ${colorClass}`}
                                                            style={style}
                                                        >
                                                            <div className="font-bold leading-tight line-clamp-1">{event.patientName}</div>
                                                            <div className="text-[10px] opacity-90 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">
                                                                {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                                                            </div>
                                                            {event.doctorName && (
                                                                <div className="mt-1 pt-1 border-t border-current border-opacity-10 text-[10px] opacity-80 line-clamp-1">
                                                                    Dr. {event.doctorName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}
