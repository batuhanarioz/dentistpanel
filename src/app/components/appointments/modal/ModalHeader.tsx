import React from "react";

interface ModalHeaderProps {
    editing: boolean;
    formDate: string;
    formTime: string;
    onClose: () => void;
}

export function ModalHeader({ editing, formDate, formTime, onClose }: ModalHeaderProps) {
    return (
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-500 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white/10 p-2">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white">
                            {editing ? "Randevuyu Düzenle" : "Yeni Randevu"}
                        </h2>
                        <p className="text-xs text-white/70">
                            {formDate} · {formTime || "Saat seçilmedi"}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
