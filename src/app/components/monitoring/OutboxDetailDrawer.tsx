"use client";

import { useUSSOutboxDetail } from "@/hooks/useUSSMonitoring";
import {
    X,
    Terminal,
    Copy,
    Check,
    Clock,
    ArrowRight,
    ShieldAlert,
    AlertCircle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Props {
    outboxId: string | null;
    onClose: () => void;
}

export function OutboxDetailDrawer({ outboxId, onClose }: Props) {
    const { data: outbox, isLoading } = useUSSOutboxDetail(outboxId);
    const [copied, setCopied] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        if (outboxId) {
            document.addEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "auto";
        };
    }, [outboxId, onClose]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const statusColors: Record<string, string> = {
        processed: "bg-emerald-100 text-emerald-700 border-emerald-200",
        failed: "bg-rose-100 text-rose-700 border-rose-200",
        pending: "bg-amber-100 text-amber-700 border-amber-200",
        retrying: "bg-blue-100 text-blue-700 border-blue-200",
    };

    if (!outboxId) return null;

    return (
        <div className={`fixed inset-0 z-[120] transition-opacity duration-300 ${outboxId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={`absolute inset-y-0 right-0 w-full max-w-2xl bg-slate-900 text-slate-300 shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${outboxId ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-teal-400">
                            <Terminal className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white tracking-widest uppercase">Outbox Event Detail</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono font-bold text-slate-500">{outboxId}</span>
                                {outbox && (
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${statusColors[outbox.status] || 'bg-slate-800 text-slate-400'}`}>
                                        {outbox.status}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hydrating state...</p>
                        </div>
                    ) : (
                        <>
                            {/* Lifecycle Info */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Created</span>
                                    <p className="text-xs font-bold text-slate-200">
                                        {outbox?.timestamps.created_at ? format(new Date(outbox.timestamps.created_at), "HH:mm:ss", { locale: tr }) : "-"}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Attempts</span>
                                    <p className="text-xs font-bold text-slate-200">{outbox?.attempts ?? 0} / 5</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Last Update</span>
                                    <p className="text-xs font-bold text-slate-200">
                                        {outbox?.timestamps.updated_at ? format(new Date(outbox.timestamps.updated_at), "HH:mm:ss", { locale: tr }) : "-"}
                                    </p>
                                </div>
                            </div>

                            {/* Payload Viewer */}
                            <section className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <ArrowRight className="h-3 w-3 text-teal-400" />
                                        Payload
                                    </h3>
                                    <button
                                        onClick={() => copyToClipboard(JSON.stringify(outbox?.payload, null, 2))}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 text-[9px] font-bold text-slate-400 transition-colors uppercase tracking-tight"
                                    >
                                        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                        {copied ? "Copied" : "Copy JSON"}
                                    </button>
                                </div>
                                <div className="relative group">
                                    <pre className="p-4 rounded-2xl bg-black/40 border border-white/5 text-[11px] font-mono leading-relaxed overflow-x-auto text-teal-300/80 custom-scrollbar max-h-[300px]">
                                        {JSON.stringify(outbox?.payload, null, 2)}
                                    </pre>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[8px] bg-white/10 px-1 rounded text-slate-400 uppercase">JSON</span>
                                    </div>
                                </div>
                            </section>

                            {/* Error Log */}
                            {outbox?.error && (
                                <section className="space-y-3">
                                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldAlert className="h-3 w-3 text-rose-400" />
                                        Stack Trace / Error Message
                                    </h3>
                                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                                            <pre className="text-[11px] font-mono text-rose-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                                {typeof outbox.error === 'string' ? outbox.error : JSON.stringify(outbox.error, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Transmission History */}
                            <section className="space-y-3">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    Lifecycle Events
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-4 text-[11px]">
                                        <span className="w-16 font-bold text-slate-500 uppercase py-1">CREATED</span>
                                        <div className="h-px flex-1 bg-slate-800" />
                                        <span className="text-slate-400">{outbox?.timestamps.created_at ? new Date(outbox.timestamps.created_at).toLocaleString('tr-TR') : '-'}</span>
                                    </div>
                                    {outbox?.timestamps.processed_at && (
                                        <div className="flex items-center gap-4 text-[11px]">
                                            <span className="w-16 font-bold text-emerald-500 uppercase py-1">PROCESSED</span>
                                            <div className="h-px flex-1 bg-emerald-900/30" />
                                            <span className="text-slate-400">{new Date(outbox.timestamps.processed_at).toLocaleString('tr-TR')}</span>
                                        </div>
                                    )}
                                    {outbox?.timestamps.failed_at && (
                                        <div className="flex items-center gap-4 text-[11px]">
                                            <span className="w-16 font-bold text-rose-500 uppercase py-1">FAILED</span>
                                            <div className="h-px flex-1 bg-rose-900/30" />
                                            <span className="text-slate-400">{new Date(outbox.timestamps.failed_at).toLocaleString('tr-TR')}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </div>

                {/* Action Bar */}
                <div className="p-6 border-t border-slate-800 bg-slate-900 flex gap-3">
                    <button
                        disabled={isLoading || outbox?.status === 'processed'}
                        className="flex-1 px-4 py-3 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-lg shadow-teal-900/40 hover:bg-teal-500 disabled:opacity-50 disabled:bg-slate-800 disabled:shadow-none transition-all active:scale-95"
                    >
                        Re-queue Event
                    </button>
                    <button
                        disabled={isLoading || outbox?.status === 'processed'}
                        className="px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-rose-400 text-xs font-bold hover:bg-rose-500/10 transition-all active:scale-95"
                    >
                        Mark as Dead
                    </button>
                </div>
            </div>
        </div>
    );
}
