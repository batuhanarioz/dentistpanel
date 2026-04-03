"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertCircle, HelpCircle, Trash2, X } from "lucide-react";

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
}

interface ConfirmContextValue {
    confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions(opts);
        setIsOpen(true);
    }, []);

    const handleClose = () => {
        if (loading) return;
        setIsOpen(false);
        setTimeout(() => setOptions(null), 300);
    };

    const handleConfirm = async () => {
        if (!options) return;
        try {
            setLoading(true);
            await options.onConfirm();
            setIsOpen(false);
            setTimeout(() => setOptions(null), 300);
        } catch (error) {
            console.error("Confirmation action failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const variantStyles = {
        danger: {
            icon: <Trash2 className="w-8 h-8 text-rose-500" />,
            bg: "from-rose-50 to-white",
            button: "bg-rose-600 hover:bg-rose-700 shadow-rose-200",
            iconBg: "bg-rose-100",
            title: "text-rose-900"
        },
        warning: {
            icon: <AlertCircle className="w-8 h-8 text-amber-500" />,
            bg: "from-amber-50 to-white",
            button: "bg-amber-600 hover:bg-amber-700 shadow-amber-200",
            iconBg: "bg-amber-100",
            title: "text-amber-900"
        },
        info: {
            icon: <HelpCircle className="w-8 h-8 text-indigo-500" />,
            bg: "from-indigo-50 to-white",
            button: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200",
            iconBg: "bg-indigo-100",
            title: "text-indigo-900"
        }
    };

    const activeStyle = options ? variantStyles[options.variant || "info"] : variantStyles.info;

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            
            {/* Confirmation Modal */}
            {isOpen && options && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={handleClose} />
                    
                    <div className={`relative w-full max-w-sm bg-gradient-to-b ${activeStyle.bg} rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300`}>
                        <div className="p-8 pb-10 text-center">
                            <div className={`w-20 h-20 ${activeStyle.iconBg} rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm`}>
                                {activeStyle.icon}
                            </div>
                            
                            <h3 className={`text-xl font-black mb-3 ${activeStyle.title}`}>
                                {options.title}
                            </h3>
                            
                            <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                                {options.message}
                            </p>
                        </div>
                        
                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                onClick={handleClose}
                                disabled={loading}
                                className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                            >
                                {options.cancelText || "Vazgeç"}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={loading}
                                className={`flex-1 h-12 ${activeStyle.button} text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2`}
                            >
                                {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                                {options.confirmText || "Onayla"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
}
