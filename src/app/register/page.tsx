"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import nextgencyLogo from "../nextgency-logo-yatay.png";
import { Loader2, Hospital, User, Mail, Lock, Phone, MapPin, CheckCircle2, ArrowRight, ChevronDown } from "lucide-react";
import { TURKEY_CITIES } from "@/constants/locations";
import { trackSignup } from "@/lib/analytics";

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [referralCode] = useState<string>(() => searchParams.get("ref") ?? "");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        fullName: "",
        email: "",
        phone: "",
        city: "",
        district: "",
        detailedAddress: "",
        adminPassword: "",
        confirmPassword: ""
    });

    const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
    const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null);
    const [isPhoneAvailable, setIsPhoneAvailable] = useState<boolean | null>(null);

    const [isCheckingSlug, setIsCheckingSlug] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isCheckingPhone, setIsCheckingPhone] = useState(false);

    // Auto-generate slug from clinic name
    useEffect(() => {
        if (formData.name) {
            const trMap: Record<string, string> = {
                'ç': 'c', 'ğ': 'g', 'ş': 's', 'ü': 'u', 'ö': 'o', 'ı': 'i',
                'Ç': 'c', 'Ğ': 'g', 'Ş': 's', 'Ü': 'u', 'Ö': 'o', 'İ': 'i'
            };
            let text = formData.name;
            for (const key in trMap) {
                text = text.replace(new RegExp(key, 'g'), trMap[key]);
            }
            const generatedSlug = text
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, "") // Remove special chars
                .replace(/\s+/g, "-") // Replace spaces with -
                .replace(/-+/g, "-"); // Replace multiple - with single -
            setFormData(prev => ({ ...prev, slug: generatedSlug }));
        }
    }, [formData.name]);

    // Check slug availability with debounce
    useEffect(() => {
        if (!formData.slug || formData.slug.length < 3) {
            setIsSlugAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingSlug(true);
            try {
                const res = await fetch(`/api/auth/check-availability?type=slug&value=${formData.slug}`);
                const data = await res.json();
                setIsSlugAvailable(data.available);
            } catch (err) {
                console.error("Slug check error:", err);
            } finally {
                setIsCheckingSlug(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.slug]);

    // Check email availability
    useEffect(() => {
        if (!formData.email || !formData.email.includes("@")) {
            setIsEmailAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingEmail(true);
            try {
                const res = await fetch(`/api/auth/check-availability?type=email&value=${formData.email}`);
                const data = await res.json();
                setIsEmailAvailable(data.available);
            } catch (err) {
                console.error("Email check error:", err);
            } finally {
                setIsCheckingEmail(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.email]);

    // Check phone availability
    useEffect(() => {
        if (!formData.phone || formData.phone.length < 10) {
            setIsPhoneAvailable(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingPhone(true);
            try {
                const res = await fetch(`/api/auth/check-availability?type=phone&value=${formData.phone}`);
                const data = await res.json();
                setIsPhoneAvailable(data.available);
            } catch (err) {
                console.error("Phone check error:", err);
            } finally {
                setIsCheckingPhone(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.phone]);

    // Clear error when form data changes
    useEffect(() => {
        if (error) setError(null);
    }, [formData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (isSlugAvailable === false) {
            setError("Bu klinik adresi zaten kullanımda.");
            return;
        }

        if (isEmailAvailable === false) {
            setError("Bu e-posta adresi zaten kullanımda.");
            return;
        }

        if (isPhoneAvailable === false) {
            setError("Bu telefon numarası zaten kullanımda.");
            return;
        }

        if (!formData.city || !formData.district) {
            setError("Lütfen il ve ilçe seçimi yapın.");
            return;
        }

        if (!formData.phone || formData.phone.length < 10) {
            setError("Geçerli bir telefon numarası giriniz.");
            return;
        }

        if (formData.adminPassword.length < 6) {
            setError("Şifreniz en az 6 karakterden oluşmalıdır.");
            return;
        }

        if (formData.adminPassword !== formData.confirmPassword) {
            setError("Girdiğiniz şifreler birbiriyle eşleşmemektedir.");
            return;
        }

        if (!formData.fullName || formData.fullName.length < 3) {
            setError("Lütfen yetkili adını ve soyadını giriniz.");
            return;
        }

        setLoading(true);

        try {
            const fullAddress = `${formData.city} / ${formData.district}${formData.detailedAddress ? ` - ${formData.detailedAddress}` : ""}`;

            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    slug: formData.slug,
                    email: formData.email,
                    phone: formData.phone,
                    address: fullAddress,
                    adminPassword: formData.adminPassword,
                    ...(referralCode ? { referral_code: referralCode } : {}),
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Kayıt işlemi sırasında bir hata oluştu.");
            }

            trackSignup(formData.name);
            setSuccess(true);

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Kayıt işlemi sırasında bir hata oluştu.");
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-12 text-center space-y-6 border border-teal-100">
                    <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto text-teal-600">
                        <Mail className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 mb-3">E-postanızı Kontrol Edin</h2>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            <span className="font-bold text-slate-700">{formData.email}</span> adresine bir doğrulama bağlantısı gönderdik.
                        </p>
                        <p className="text-slate-400 text-sm mt-2">
                            Bağlantıya tıkladıktan sonra hesabınız aktif olacak ve giriş yapabileceksiniz.
                        </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-left space-y-1.5">
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Mail gelmediyse</p>
                        <p className="text-xs text-amber-600">Spam / Gereksiz posta klasörünü kontrol edin. Birkaç dakika sürebilir.</p>
                    </div>
                    <Link href={`/login?email=${encodeURIComponent(formData.email)}`} className="inline-flex items-center gap-2 text-teal-600 font-bold hover:text-teal-700">
                        Giriş sayfasına git <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
            {/* Left Column - Branding (Desktop) */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative flex-col justify-between overflow-hidden bg-black p-12 xl:p-20 shadow-2xl">
                <div className="absolute top-0 -left-1/4 w-[150%] h-[150%] bg-teal-500/10 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse duration-1000"></div>
                <div className="absolute bottom-0 -right-1/4 w-[120%] h-[120%] bg-emerald-400/10 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse duration-1000" style={{ animationDelay: '2s' }}></div>

                <div className="relative z-10 w-full mb-16 lg:mb-0">
                    <div className="mb-16 block">
                        <Link href="/" className="inline-block transition-transform hover:scale-105 active:scale-95">
                            <Image src={nextgencyLogo} alt="NextGency Logo" height={52} className="w-auto object-contain" priority />
                        </Link>
                    </div>

                    <div className="space-y-12">
                        <div>
                            <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white mb-6 leading-[1.1] uppercase">
                                Klinik Yönetiminde <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-emerald-200">
                                    Yeni Bir Dönem Başlatın
                                </span>
                            </h1>
                            <p className="text-lg text-teal-100/70 max-w-sm leading-relaxed font-light">
                                Sadece birkaç dakikada kliniğinizi oluşturun, dijital dönüşümü bugünden yaşayın.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {[
                                { title: "Hızlı Kurulum", desc: "Formu doldurun, anında kullanmaya başlayın." },
                                { title: "Tüm Özellikler", desc: "Randevu, ödeme ve hasta takibi tek bir yerde." },
                                { title: "7/24 Destek", desc: "Süper Admin ekibimiz her zaman yanınızda." }
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-teal-300">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-sm tracking-wide">{item.title}</h4>
                                        <p className="text-teal-100/40 text-xs font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 pt-10 border-t border-white/10">
                    <p className="text-[10px] text-teal-100/20 font-black uppercase tracking-[0.2em]">NextGency OS • Dental Suite v2.0</p>
                </div>
            </div>

            {/* Right Column - Registration Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 relative overflow-hidden bg-slate-50">
                {/* Mobile Header Background */}
                <div className="lg:hidden absolute top-0 left-0 right-0 h-[220px] bg-black rounded-b-[2.5rem] shadow-xl"></div>

                {/* Mobile Branding */}
                <div className="lg:hidden w-full max-w-[500px] relative z-10 flex flex-col items-center mb-8">
                    <Link href="/" className="mb-4">
                        <Image src={nextgencyLogo} alt="NextGency Logo" height={40} className="w-auto" priority />
                    </Link>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">Kliniğinizi Oluşturun</h2>
                </div>

                <div className="w-full max-w-[500px] relative z-10">
                    <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 shadow-2xl p-6 sm:p-10">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kayıt Olun</h2>
                                <p className="text-sm text-slate-500 font-medium">Sistemi kullanmak için klinik bilgilerinizi girin</p>
                            </div>
                            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                                <Hospital className="w-6 h-6" />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {referralCode && (
                                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                                    <span className="text-emerald-600 text-base">🎁</span>
                                    <p className="text-xs font-bold text-emerald-700">
                                        Davet kodu uygulandı: <span className="font-black">{referralCode}</span>
                                    </p>
                                </div>
                            )}
                            {/* Section: Clinic Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Klinik Adı *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <Hospital className="w-4 h-4" />
                                        </div>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Örn: Mavi Diş Polikliniği"
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 transition-all shadow-inner"
                                        />
                                    </div>
                                    {formData.slug && (
                                        <div className="flex items-center justify-between px-1">
                                            <p className="text-[10px] text-slate-400 font-bold mt-1 italic">
                                                Adresiniz: <span className={isSlugAvailable === false ? "text-rose-500" : "text-teal-600"}>{`clinic.nextgency360.com/${formData.slug}`}</span>
                                            </p>
                                            <div className="mt-1">
                                                {isCheckingSlug ? (
                                                    <Loader2 className="w-3 h-3 animate-spin text-slate-300" />
                                                ) : isSlugAvailable === true ? (
                                                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Müsait</span>
                                                ) : isSlugAvailable === false ? (
                                                    <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Alınmış</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section: Personal Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Yetkili Ad Soyad *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Adınız Soyadınız"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-Posta *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <input
                                            required
                                            type="email"
                                            placeholder="ornek@domain.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 transition-all shadow-inner"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                            {isCheckingEmail ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                                            ) : isEmailAvailable === true ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            ) : isEmailAvailable === false ? (
                                                <span className="text-rose-500 text-[10px] font-bold">Kullanılıyor</span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Telefon *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <input
                                            required
                                            type="tel"
                                            placeholder="05xx..."
                                            value={formData.phone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 transition-all shadow-inner"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                            {isCheckingPhone ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                                            ) : isPhoneAvailable === true ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            ) : isPhoneAvailable === false ? (
                                                <span className="text-rose-500 text-[10px] font-bold">Kullanılıyor</span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Şehir (İl) *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <select
                                            required
                                            value={formData.city}
                                            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value, district: "" }))}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none pl-12 pr-10 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 transition-all shadow-inner appearance-none"
                                        >
                                            <option value="">İl Seçiniz</option>
                                            {TURKEY_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">İlçe *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <select
                                            required
                                            disabled={!formData.city}
                                            value={formData.district}
                                            onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none pl-12 pr-10 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 transition-all shadow-inner appearance-none disabled:opacity-50"
                                        >
                                            <option value="">İlçe Seçiniz</option>
                                            {TURKEY_CITIES.find(c => c.name === formData.city)?.districts.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Adres Detayı (Opsiyonel)</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Mahalle, cadde, numara..."
                                            value={formData.detailedAddress}
                                            onChange={(e) => setFormData(prev => ({ ...prev, detailedAddress: e.target.value }))}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Passwords */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 mt-2">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Şifre *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <input
                                            required
                                            type="password"
                                            placeholder="••••••"
                                            value={formData.adminPassword}
                                            onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Şifre Tekrar *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-600 transition-colors">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <input
                                            required
                                            type="password"
                                            placeholder="••••••"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                            className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-700">
                                    <CheckCircle2 className="w-4 h-4 shrink-0 rotate-45" />
                                    <p className="text-xs font-bold">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || isCheckingSlug || isCheckingEmail || isCheckingPhone || isSlugAvailable === false || isEmailAvailable === false || isPhoneAvailable === false}
                                className="w-full h-14 rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-teal-100 hover:shadow-teal-200 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none group"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        İşleniyor...
                                    </>
                                ) : (
                                    <>
                                        Üyeliğimi Başlat
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Zaten bir hesabınız var mı?{" "}
                                <Link href="/login" className="text-teal-600 hover:text-teal-700 transition-colors">
                                    Giriş Yapın
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense>
            <RegisterForm />
        </Suspense>
    );
}
