import Link from "next/link";
import { LandingNav } from "@/app/components/landing/LandingNav";

const legalLinks = [
  { href: "/iletisim", label: "İletişim" },
  { href: "/teslimat-ve-kullanim", label: "Teslimat ve Kullanım" },
  { href: "/satis-politikasi", label: "Satış Politikası" },
  { href: "/iptal-ve-iade", label: "İptal ve İade" },
  { href: "/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi" },
];

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
}

export function LegalLayout({ children, title, description, badge = "Yasal" }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <LandingNav />

      {/* Page header */}
      <div className="pt-28 pb-14 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-6">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">{badge}</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-tight mb-4">{title}</h1>
          <p className="text-slate-500 font-medium leading-relaxed max-w-xl">{description}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        {children}
      </div>

      {/* Legal footer */}
      <footer className="border-t border-slate-100 bg-slate-50 py-10">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Yasal Sayfalar</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Yasal bağlantılar">
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-slate-500 hover:text-teal-600 font-semibold transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-slate-300 mt-8">© {new Date().getFullYear()} NextGency OS — Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}

/** Reusable section card inside legal pages */
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-black text-slate-900 mb-4 pb-3 border-b border-slate-100">{title}</h2>
      <div className="space-y-3 text-sm text-slate-600 font-medium leading-relaxed">
        {children}
      </div>
    </section>
  );
}

/** Highlight / info box */
export function LegalInfoBox({ children, color = "teal" }: { children: React.ReactNode; color?: "teal" | "amber" | "rose" }) {
  const styles = {
    teal: "bg-teal-50 border-teal-200 text-teal-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    rose: "bg-rose-50 border-rose-200 text-rose-800",
  };
  return (
    <div className={`rounded-2xl border px-5 py-4 text-sm font-medium leading-relaxed ${styles[color]}`}>
      {children}
    </div>
  );
}
