import React from "react";

interface ModalFooterProps {
    editing: boolean;
    onClose: () => void;
    handleDelete: () => void;
}

export function ModalFooter({ editing, onClose, handleDelete }: ModalFooterProps) {
    return (
        <div className="md:col-span-2 mt-4 pt-4 border-t flex items-center justify-between gap-2">
            {editing && (
                <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                    Randevuyu sil
                </button>
            )}
            <div className="ml-auto flex gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                    Vazgeç
                </button>
                <button
                    type="submit"
                    className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-2 text-xs font-medium text-white hover:from-indigo-700 hover:to-violet-600 transition-all font-bold"
                >
                    {editing ? "Kaydet" : "Oluştur"}
                </button>
            </div>
        </div>
    );
}
