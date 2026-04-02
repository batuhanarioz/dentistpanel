"use client";

import { Suspense, useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
    Hospital,
    User,
    Mail,
    Phone,
    MapPin,
    Lock,
    CheckCircle2,
    ArrowRight,
    Loader2,
    ChevronDown
} from "lucide-react";
import nextgencyLogo from "../nextgency-logo-yatay.png";

import { trackSignup } from "@/lib/analytics";

const isValidTRPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith("0"));
};

import { TURKEY_CITIES } from "@/lib/locations";

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const referralCode = searchParams.get("ref");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

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

    const [isCheckingSlug, setIsCheckingSlug] = useState(false);
    const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null);
    const [isCheckingPhone, setIsCheckingPhone] = useState(false);
    const [isPhoneAvailable, setIsPhoneAvailable] = useState<boolean | null>(null);

    const slugTimeout = useRef<NodeJS.Timeout | null>(null);
    const emailTimeout = useRef<NodeJS.Timeout | null>(null);
    const phoneTimeout = useRef<NodeJS.Timeout | null>(null);

    // Auto-generate slug from clinic name
    useEffect(() => {
        if (!formData.name) {
            setFormData(prev => ({ ...prev, slug: "" }));
            setIsSlugAvailable(null);
            return;
        }

        const newSlug = formData.name
            .toLowerCase()
            .trim()
            .replace(/[üğışçö]/g, (m) => ({ 'ü': 'u', 'ğ': 'g', 'ı': 'i', 'ş': 's', 'ç': 'c', 'ö': 'o' }[m] || m))
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        setFormData(prev => ({ ...prev, slug: newSlug }));

        if (slugTimeout.current) clearTimeout(slugTimeout.current);
        slugTimeout.current = setTimeout(async () => {
            if (!newSlug) return;
            setIsCheckingSlug(true);
            const { data } = await supabase.from("clinics").select("id").eq("slug", newSlug).maybeSingle();
            setIsSlugAvailable(!data);
            setIsCheckingSlug(false);
        }, 600);
    }, [formData.name]);

    // Validation checks for Email/Phone
    useEffect(() => {
        if (!formData.email || !formData.email.includes("@")) {
            setIsEmailAvailable(null);
            return;
        }
        if (emailTimeout.current) clearTimeout(emailTimeout.current);
        emailTimeout.current = setTimeout(async () => {
            setIsCheckingEmail(true);
            const { data } = await supabase.from("users").select("id").eq("email", formData.email).maybeSingle();
            setIsEmailAvailable(!data);
            setIsCheckingEmail(false);
        }, 600);
    }, [formData.email]);

    useEffect(() => {
        if (!formData.phone || formData.phone.length < 10) {
            setIsPhoneAvailable(null);
            return;
        }
        if (phoneTimeout.current) clearTimeout(phoneTimeout.current);
        phoneTimeout.current = setTimeout(async () => {
            setIsCheckingPhone(true);
            const { data } = await supabase.from("users").select("id").eq("phone", formData.phone).maybeSingle();
            setIsPhoneAvailable(!data);
            setIsCheckingPhone(false);
        }, 600);
    }, [formData.phone]);

    useEffect(() => {
        if (error) setError(null);
    }, [formData]);

    // Stepper state
    const [currentStep, setCurrentStep] = useState(1);

    const nextStep = () => {
        if (currentStep === 1) {
            if (!formData.name || isSlugAvailable === false) {
                setError("Lütfen klinik adını girin ve geçerli bir adres olduğundan emin olun.");
                return;
            }
            if (!formData.city || !formData.district) {
                setError("Lütfen çalışma bölgesi seçiniz.");
                return;
            }
        }
        if (currentStep === 2) {
            if (!formData.fullName || !formData.email || !formData.phone) {
                setError("Lütfen tüm iletişim bilgilerini doldurun.");
                return;
            }
            if (!isValidTRPhone(formData.phone)) {
                setError("Geçerli bir telefon numarası giriniz.");
                return;
            }
            if (isEmailAvailable === false || isPhoneAvailable === false) {
                setError("Bu bilgiler zaten kullanımda.");
                return;
            }
        }
        setError(null);
        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        setError(null);
        setCurrentStep(prev => prev - 1);
    };

    // SEARCHABLE SELECT STATE
    const [citySearch, setCitySearch] = useState("");
    const [isCityOpen, setIsCityOpen] = useState(false);
    const [districtSearch, setDistrictSearch] = useState("");
    const [isDistrictOpen, setIsDistrictOpen] = useState(false);

    const filteredCities = TURKEY_CITIES.filter(c => {
        const normalize = (str: string) => str.toLowerCase().replace(/[ığüşöç]/g, m => ({'ı':'i','ğ':'g','ü':'u','ş':'s','ö':'o','ç':'c'}[m] || m));
        const search = normalize(citySearch);
        const name = normalize(c.name);
        return name.includes(search);
    }).sort((a, b) => {
        const normalize = (str: string) => str.toLowerCase().replace(/[ığüşöç]/g, m => ({'ı':'i','ğ':'g','ü':'u','ş':'s','ö':'o','ç':'c'}[m] || m));
        const search = normalize(citySearch);
        const nameA = normalize(a.name);
        const nameB = normalize(b.name);
        
        const startsA = nameA.startsWith(search);
        const startsB = nameB.startsWith(search);
        
        if (startsA && !startsB) return -1;
        if (!startsA && startsB) return 1;
        return a.name.localeCompare(b.name, "tr");
    });

    const currentCity = TURKEY_CITIES.find(c => c.name === formData.city);
    const filteredDistricts = (currentCity?.districts || []).filter(d => {
        const normalize = (str: string) => str.toLowerCase().replace(/[ığüşöç]/g, m => ({'ı':'i','ğ':'g','ü':'u','ş':'s','ö':'o','ç':'c'}[m] || m));
        const search = normalize(districtSearch);
        const name = normalize(d);
        return name.includes(search);
    }).sort((a, b) => {
        const normalize = (str: string) => str.toLowerCase().replace(/[ığüşöç]/g, m => ({'ı':'i','ğ':'g','ü':'u','ş':'s','ö':'o','ç':'c'}[m] || m));
        const search = normalize(districtSearch);
        const nameA = normalize(a);
        const nameB = normalize(b);
        
        const startsA = nameA.startsWith(search);
        const startsB = nameB.startsWith(search);
        
        if (startsA && !startsB) return -1;
        if (!startsA && startsB) return 1;
        return a.localeCompare(b, "tr");
    });

    const cityRef = useRef<HTMLDivElement>(null);
    const districtRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cityRef.current && !cityRef.current.contains(event.target as Node)) setIsCityOpen(false);
            if (districtRef.current && !districtRef.current.contains(event.target as Node)) setIsDistrictOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (currentStep < 3) {
            nextStep();
            return;
        }

        setError(null);

        if (formData.adminPassword.length < 6) {
            setError("Şifreniz en az 6 karakterden oluşmalıdır.");
            return;
        }

        if (formData.adminPassword !== formData.confirmPassword) {
            setError("Girdiğiniz şifreler birbiriyle eşleşmemektedir.");
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
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-12 text-center space-y-6 border border-indigo-100 animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                        <Mail className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">E-postanızı Kontrol Edin</h2>
                        <p className="text-slate-500 font-medium leading-relaxed italic">
                            Aktivasyon linkini gönderdik!
                        </p>
                        <p className="text-slate-500 mt-2 font-semibold">
                            <span className="text-indigo-600">{formData.email}</span>
                        </p>
                        <p className="text-slate-400 text-sm mt-4 leading-relaxed">
                            Bağlantıya tıkladıktan sonra hesabınız aktif olacak ve giriş yapabileceksiniz.
                        </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-left space-y-1.5">
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Önemli</p>
                        <p className="text-xs text-amber-600 font-medium">Spam / Gereksiz posta klasörünü kontrol edin. Birkaç dakika sürebilir.</p>
                    </div>
                    <Link href={`/login?email=${encodeURIComponent(formData.email)}`} className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700 transition-all hover:gap-3">
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
                <div className="absolute top-0 -left-1/4 w-[150%] h-[150%] bg-indigo-500/10 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse duration-1000"></div>
                <div className="absolute bottom-0 -right-1/4 w-[120%] h-[120%] bg-teal-400/10 rounded-full mix-blend-overlay filter blur-[100px] animate-pulse duration-1000" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/4 w-full h-[50%] bg-blue-600/10 rounded-full mix-blend-screen filter blur-[120px]"></div>

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
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-teal-200">
                                    Yeni Bir Dönem Başlatın
                                </span>
                            </h1>
                            <p className="text-lg text-indigo-100/70 max-w-sm leading-relaxed font-light mt-4">
                                Sadece birkaç dakikada kliniğinizi oluşturun, dijital dönüşümü bugünden yaşayın.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {[
                                { title: "Hızlı Kurulum", desc: "Formu doldurun, anında kullanmaya başlayın." },
                                { title: "Tüm Özellikler", desc: "Randevu, ödeme ve hasta takibi tek bir yerde." },
                                { title: "7/24 Destek", desc: "Geliştirici ekibimiz her zaman yanınızda." }
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 group">
                                    <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-indigo-300 group-hover:bg-indigo-500/20 transition-all">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-sm tracking-wide">{item.title}</h4>
                                        <p className="text-teal-100/40 text-xs font-medium mt-0.5 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 pt-10 border-t border-white/10">
                    <p className="text-[10px] text-indigo-100/20 font-black uppercase tracking-[0.2em]">NextGency OS • Dental Suite v2.0</p>
                </div>
            </div>

            {/* Right Column - Registration Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 relative overflow-hidden bg-slate-50">
                {/* Mobile Premium Dark Top Background */}
                <div className="lg:hidden absolute top-0 left-0 right-0 h-[380px] bg-black rounded-b-[2.5rem] shadow-xl"></div>

                {/* Mobile Branding */}
                <div className="lg:hidden w-full max-w-[500px] relative z-10 flex flex-col items-center mb-10">
                    <Link href="/" className="inline-block transition-transform hover:scale-105 active:scale-95 mb-6">
                        <Image src={nextgencyLogo} alt="NextGency Logo" height={44} className="w-auto opacity-100 object-contain" priority />
                    </Link>
                    <h2 className="text-2xl font-black tracking-tight text-white mb-1 drop-shadow-md text-center uppercase">
                        NextGency OS
                    </h2>
                    <p className="text-[10px] text-slate-300 font-bold drop-shadow-sm uppercase tracking-[0.2em] mb-2">
                        Diş Klinikleri Yönetim Merkezi
                    </p>
                </div>

                <div className="w-full max-w-[500px] relative z-10">
                    <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 shadow-2xl p-5 sm:p-10 transition-all duration-500 overflow-hidden">

                        {/* Stepper Header */}
                        <div className="mb-6 md:mb-8">
                            <div className="flex items-center justify-between mb-3 md:mb-4">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                        {currentStep === 1 && "Klinik Bilgileri"}
                                        {currentStep === 2 && "Yetkili Kişi"}
                                        {currentStep === 3 && "Erişim ve Güvenlik"}
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium">
                                        {currentStep === 1 && "Kliniğinizin genel bilgilerini girin"}
                                        {currentStep === 2 && "Hesap yöneticisi detaylarını ekleyin"}
                                        {currentStep === 3 && "Giriş şifrenizi belirleyin"}
                                    </p>
                                </div>
                                <div className="text-[14px] font-black text-indigo-600 bg-indigo-50 h-10 w-10 flex items-center justify-center rounded-xl ring-1 ring-indigo-100">
                                    {currentStep}/3
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-teal-500 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
                                    style={{ width: `${(currentStep / 3) * 100}%` }}
                                />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {referralCode && currentStep === 1 && (
                                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 animate-in slide-in-from-top-2 duration-300">
                                    <span className="text-emerald-600 text-base">🎁</span>
                                    <p className="text-xs font-bold text-emerald-700">
                                        Davet kodu uygulandı: <span className="font-black">{referralCode}</span>
                                    </p>
                                </div>
                            )}

                            {/* STEP 1: CLINIC INFO */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Klinik Adı *</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                <Hospital className="w-4 h-4" />
                                            </div>
                                            <input
                                                required
                                                type="text"
                                                placeholder="Örn: Mavi Diş Polikliniği"
                                                value={formData.name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                                            />
                                        </div>
                                        {formData.slug && (
                                            <div className="flex items-center justify-between px-1">
                                                <p className="text-[10px] text-slate-400 font-bold mt-1 italic">
                                                    Adresiniz: <span className={isSlugAvailable === false ? "text-rose-500" : "text-indigo-600"}>{`clinic.nextgency360.com/${formData.slug}`}</span>
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-4">
                                        {/* CITY SELECT */}
                                        <div className="space-y-1.5 relative" ref={cityRef}>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Şehir (İl) *</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="İl Ara..."
                                                    value={isCityOpen ? citySearch : formData.city || ""}
                                                    onFocus={() => { setIsCityOpen(true); setCitySearch(""); }}
                                                    onChange={(e) => setCitySearch(e.target.value)}
                                                    className="w-full h-12 rounded-2xl bg-slate-50 border-none pl-12 pr-10 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCityOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>
                                            
                                            {isCityOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="p-1">
                                                        {filteredCities.length > 0 ? (
                                                            filteredCities.map(city => (
                                                                <button
                                                                    key={city.name}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({ ...prev, city: city.name, district: "" }));
                                                                        setIsCityOpen(false);
                                                                        setCitySearch(city.name);
                                                                    }}
                                                                    className={`w-full text-left px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${formData.city === city.name ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                                                >
                                                                    {city.name}
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Sonuç Bulunamadı</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* DISTRICT SELECT */}
                                        <div className="space-y-1.5 relative" ref={districtRef}>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">İlçe *</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder={formData.city ? "İlçe Ara..." : "Önce İl Seçin"}
                                                    disabled={!formData.city}
                                                    value={isDistrictOpen ? districtSearch : formData.district || ""}
                                                    onFocus={() => { if(formData.city) { setIsDistrictOpen(true); setDistrictSearch(""); } }}
                                                    onChange={(e) => setDistrictSearch(e.target.value)}
                                                    className="w-full h-12 rounded-2xl bg-slate-50 border-none pl-12 pr-10 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner disabled:opacity-50"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDistrictOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>

                                            {isDistrictOpen && formData.city && (
                                                <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="p-1">
                                                        {filteredDistricts.length > 0 ? (
                                                            filteredDistricts.map(district => (
                                                                <button
                                                                    key={district}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({ ...prev, district: district }));
                                                                        setIsDistrictOpen(false);
                                                                        setDistrictSearch(district);
                                                                    }}
                                                                    className={`w-full text-left px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${formData.district === district ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-50'}`}
                                                                >
                                                                    {district}
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="px-4 py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Sonuç Bulunamadı</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Adres Detayı (İsteğe Bağlı)</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Cadde, sokak, bina no..."
                                                value={formData.detailedAddress}
                                                onChange={(e) => setFormData(prev => ({ ...prev, detailedAddress: e.target.value }))}
                                                className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: PERSONAL INFO */}
                            {currentStep === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Yetkili Ad Soyad *</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <input
                                                required
                                                type="text"
                                                placeholder="Adınız Soyadınız"
                                                value={formData.fullName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                                className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-Posta Adresi *</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <input
                                                required
                                                type="email"
                                                placeholder="ornek@domain.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                {isCheckingEmail ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                                                ) : isEmailAvailable === true ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                ) : isEmailAvailable === false ? (
                                                    <span className="text-rose-500 text-[10px] font-bold uppercase tracking-tighter">Alınmış</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Telefon Numarası *</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <input
                                                required
                                                type="tel"
                                                placeholder="05xx ..."
                                                value={formData.phone}
                                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                {isCheckingPhone ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                                                ) : isPhoneAvailable === true ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                ) : isPhoneAvailable === false ? (
                                                    <span className="text-rose-500 text-[10px] font-bold uppercase tracking-tighter">Alınmış</span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: PASSWORD */}
                            {currentStep === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Şifre Belirleyin *</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                            <input
                                                required
                                                type="password"
                                                placeholder="••••••"
                                                value={formData.adminPassword}
                                                onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                                                className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium ml-1">En az 6 karakter, harf ve rakam içermesi önerilir.</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Şifre Tekrar *</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                            <input
                                                required
                                                type="password"
                                                placeholder="••••••"
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                className="w-full h-12 rounded-2xl bg-slate-50 border-none px-12 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-2">
                                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                                            <span className="text-sm">ℹ️</span> Kullanım Koşulları
                                        </p>
                                        <p className="text-[10px] text-blue-600 leading-relaxed font-medium">
                                            "Üyeliğimi Başlat" butonuna tıklayarak <Link href="/teslimat-ve-kullanim" className="underline font-bold">Kullanım Koşullarını</Link> ve <Link href="/satis-politikasi" className="underline font-bold">KVKK</Link> metinlerini kabul etmiş sayılırsınız.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-700 animate-in shake duration-300">
                                    <CheckCircle2 className="w-4 h-4 shrink-0 rotate-45" />
                                    <p className="text-xs font-bold">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                {currentStep > 1 && (
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="h-14 px-6 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        Geri
                                    </button>
                                )}

                                <button
                                    type={currentStep === 3 ? "submit" : "button"}
                                    onClick={currentStep < 3 ? nextStep : undefined}
                                    disabled={loading || isCheckingSlug || isCheckingEmail || isCheckingPhone}
                                    className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-teal-600 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:pointer-events-none group"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            İşleniyor...
                                        </>
                                    ) : (
                                        <>
                                            {currentStep === 3 ? "Üyeliğimi Başlat" : "Sonraki Adım"}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {currentStep === 1 && (
                                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
                                    Zaten bir hesabınız var mı?{" "}
                                    <Link href="/login" className="text-indigo-600 hover:text-indigo-700 transition-colors">
                                        Giriş Yapın
                                    </Link>
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>

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
