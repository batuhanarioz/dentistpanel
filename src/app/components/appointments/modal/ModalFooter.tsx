import React from "react";

interface ModalFooterProps {
    editing: boolean;
    handleDelete: () => void;
}

export function ModalFooter({ editing, handleDelete }: ModalFooterProps) {
    if (!editing) return null;

    return (
        <div className="md:col-span-2 mt-4 pt-4 border-t flex items-center justify-between gap-2">
            <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
                Randevuyu sil
            </button>
        </div>
    );
}
