"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

interface LandingFaqProps {
  faqs: FaqItem[];
}

export function LandingFaq({ faqs }: LandingFaqProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {faqs.map((faq, idx) => (
        <div key={idx} className="bg-slate-50 rounded-[2rem] overflow-hidden transition-all duration-300">
          <button
            onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
            className="w-full p-8 flex items-center justify-between text-left hover:bg-slate-100/50 transition-colors"
            aria-expanded={activeFaq === idx}
          >
            <span className="font-black text-lg text-slate-900 leading-tight pr-8">{faq.q}</span>
            <div className={`p-2 rounded-full transition-all shrink-0 ${activeFaq === idx ? "bg-teal-600 text-white" : "bg-white text-slate-300 shadow-sm"}`}>
              {activeFaq === idx ? <Minus size={16} /> : <Plus size={16} />}
            </div>
          </button>
          {activeFaq === idx && (
            <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-300">
              <p className="text-slate-500 font-medium leading-relaxed">{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
