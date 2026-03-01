interface ModalHeaderProps {
    editing: boolean;
    formDate: string;
    formTime: string;
    onClose: () => void;
    onSubmit?: (e: React.FormEvent | React.MouseEvent) => void;
    phoneNumber?: string;
    phoneCountryCode?: string;
}

export function ModalHeader({ editing, formDate, formTime, onClose, onSubmit, phoneNumber, phoneCountryCode }: ModalHeaderProps) {
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
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-semibold text-white">
                                {editing ? "Randevuyu Düzenle" : "Yeni Randevu"}
                            </h2>
                            {editing && phoneNumber && (
                                <a
                                    href={`https://wa.me/${phoneCountryCode?.replace(/\D/g, '') || '90'}${phoneNumber.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-[#20bd5a] active:scale-95 transition-all border border-white/20 hover:border-white/40"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    İletişime Geç
                                </a>
                            )}
                        </div>
                        <p className="text-xs text-white/70 mt-0.5">
                            {formDate} · {formTime || "Saat seçilmedi"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-all shadow-sm"
                    >
                        Vazgeç
                    </button>
                    <button
                        type="button"
                        onClick={(e) => onSubmit?.(e)}
                        className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-indigo-700 hover:bg-slate-50 transition-all shadow-md active:scale-95"
                    >
                        {editing ? "Kaydet" : "Oluştur"}
                    </button>
                </div>
            </div>
        </div>
    );
}
