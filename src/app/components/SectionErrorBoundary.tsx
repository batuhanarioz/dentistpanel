"use client";

import React from "react";

interface Props {
    children: React.ReactNode;
    label?: string;
}

interface State {
    hasError: boolean;
}

export class SectionErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(`[SectionErrorBoundary] ${this.props.label ?? "Section"} çöktü:`, error, info.componentStack);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="rounded-[28px] border border-rose-100 bg-rose-50/40 px-6 py-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-rose-700">
                            {this.props.label ? `${this.props.label} yüklenemedi` : "Bu bölüm yüklenemedi"}
                        </p>
                        <p className="text-[11px] text-rose-400 mt-0.5">Diğer bölümler normal çalışmaya devam ediyor.</p>
                    </div>
                </div>
                <button
                    onClick={() => this.setState({ hasError: false })}
                    className="shrink-0 text-[11px] font-black text-rose-600 hover:text-rose-800 underline"
                >
                    Yeniden Dene
                </button>
            </div>
        );
    }
}
