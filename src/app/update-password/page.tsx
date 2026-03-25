"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError("Şifre en az 6 karakter olmalıdır.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor");
            return;
        }

        setLoading(true);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        });

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
            return;
        }

        router.push("/");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Hoş Geldiniz!</h2>
                    <p className="mt-2 text-sm text-slate-600 font-medium">Hesabınızı tamamlamak için şifre belirlemelisiniz.</p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm font-semibold text-rose-600">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Yeni Şifreniz</label>
                                <div className="mt-2">
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-medium text-slate-900 bg-slate-50/50"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="******"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Yeni Şifreniz (Tekrar)</label>
                                <div className="mt-2">
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-medium text-slate-900 bg-slate-50/50"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="******"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 flex justify-center items-center rounded-xl bg-teal-600 text-sm font-black text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-50 tracking-wide uppercase shadow-lg shadow-teal-200"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : "Şifreyi Kaydet ve Sisteme Gir"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
