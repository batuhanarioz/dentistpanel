import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection } from "@/app/components/landing/LegalLayout";
import { WhatsAppButton } from "@/app/components/landing/WhatsAppButton";

export const metadata: Metadata = {
  title: "İletişim | NextGency OS Diş Kliniği Programı",
  description: "NextGency ile iletişime geçin. Telefon, e-posta veya WhatsApp üzerinden destek alın.",
};

export default function IletisimPage() {
  return (
    <LegalLayout
      title="İletişim"
      description="Sorularınız, destek talepleriniz veya satış görüşmeleri için aşağıdaki kanallar üzerinden bize ulaşabilirsiniz."
      badge="İletişim"
    >
      {/* Contact cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Telefon</p>
          <a
            href="tel:+905444412180"
            className="text-xl font-black text-slate-900 hover:text-teal-600 transition-colors"
          >
            +90 544 441 21 80
          </a>
          <p className="text-xs text-slate-400 font-medium mt-2">Hafta içi 09:00 – 18:00</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">E-posta</p>
          <a
            href="mailto:clinic@nextgency360.com"
            className="text-base font-black text-slate-900 hover:text-teal-600 transition-colors break-all"
          >
            clinic@nextgency360.com
          </a>
          <p className="text-xs text-slate-400 font-medium mt-2">En geç 1 iş günü içinde yanıt</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Konum</p>
          <p className="text-base font-black text-slate-900">İstanbul, Türkiye</p>
          <p className="text-xs text-slate-400 font-medium mt-2">Tüm hizmetler dijital olarak sunulmaktadır</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">WhatsApp Destek</p>
          <p className="text-sm font-semibold text-slate-700 mb-4">
            Anlık destek için WhatsApp üzerinden bize yazabilirsiniz. Mesai saatleri dışındaki talepler bir sonraki iş günü yanıtlanır.
          </p>
          <WhatsAppButton
            label="WhatsApp'ta Mesaj Gönderin"
            message="Merhaba, NextGency OS hakkında destek almak istiyorum."
          />
        </div>
      </div>

      <LegalSection title="Müşteri Desteği">
        <p>
          NextGency OS ekibi, abonelik, teknik destek ve genel sorularınız için hafta içi 09:00–18:00 saatleri arasında hizmet vermektedir. WhatsApp hattımız, hızlı iletişim kanalı olarak her zaman aktiftir; mesajlarınızı mesai saatleri dışında da iletebilirsiniz.
        </p>
        <p>
          Abonelik iptalleri ve iade talepleri için{" "}
          <Link href="/iptal-ve-iade" className="text-teal-600 hover:underline font-black">
            İptal ve İade
          </Link>{" "}
          sayfamızı inceleyebilir ya da doğrudan e-posta ile talebinizi iletebilirsiniz.
        </p>
      </LegalSection>

      <LegalSection title="Sık Kullanılan Bağlantılar">
        <nav className="grid sm:grid-cols-2 gap-3 not-prose">
          {[
            { href: "/teslimat-ve-kullanim", label: "Teslimat ve Kullanım Koşulları" },
            { href: "/satis-politikasi", label: "Satış Politikası" },
            { href: "/iptal-ve-iade", label: "İptal ve İade Politikası" },
            { href: "/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50 text-sm font-black text-slate-700 hover:text-teal-700 transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" aria-hidden="true" />
              {l.label}
            </Link>
          ))}
        </nav>
      </LegalSection>
    </LegalLayout>
  );
}
