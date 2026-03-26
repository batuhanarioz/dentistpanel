"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { PricingModal } from "@/app/components/PricingModal";
import nextgencyLogo from "../../nextgency-logo-yatay.png";

export function LandingNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${scrolled ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                <Image src={nextgencyLogo} alt="NextGency OS Diş Kliniği Programı" height={36} className="w-auto invert mix-blend-multiply" priority />
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-10">
              <a href="#ozellikler" className="text-[13px] font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors">Özellikler</a>
              <a href="#nasil-calisir" className="text-[13px] font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors">Nasıl Çalışır</a>
              <a href="#showcase" className="text-[13px] font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors">Arayüz</a>
              <button
                onClick={() => setIsPricingOpen(true)}
                className="text-[13px] font-bold tracking-widest uppercase text-slate-500 hover:text-slate-900 transition-colors"
              >
                Fiyatlandırma
              </button>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest text-white bg-black hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-black/10"
              >
                Sistem Girişi
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-slate-900 hover:bg-slate-100 transition-colors"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 animate-in slide-in-from-top-4 duration-300">
            <div className="px-6 pt-2 pb-8 space-y-4">
              <a href="#ozellikler" className="block py-4 text-sm font-bold tracking-widest uppercase text-slate-500" onClick={() => setIsMenuOpen(false)}>Özellikler</a>
              <a href="#nasil-calisir" className="block py-4 text-sm font-bold tracking-widest uppercase text-slate-500" onClick={() => setIsMenuOpen(false)}>Nasıl Çalışır</a>
              <a href="#showcase" className="block py-4 text-sm font-bold tracking-widest uppercase text-slate-500" onClick={() => setIsMenuOpen(false)}>Arayüz</a>
              <button
                className="block w-full text-left py-4 text-sm font-bold tracking-widest uppercase text-slate-500"
                onClick={() => { setIsPricingOpen(true); setIsMenuOpen(false); }}
              >
                Fiyatlandırma
              </button>
              <Link href="/login" className="block w-full text-center py-4 rounded-2xl bg-black text-white font-black uppercase tracking-widest text-xs" onClick={() => setIsMenuOpen(false)}>Sistem Girişi</Link>
            </div>
          </div>
        )}
      </nav>

      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </>
  );
}
