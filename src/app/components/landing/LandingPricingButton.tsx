"use client";

import { useState } from "react";
import { PricingModal } from "@/app/components/PricingModal";

interface LandingPricingButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function LandingPricingButton({ children, className }: LandingPricingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={className}>
        {children}
      </button>
      <PricingModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
