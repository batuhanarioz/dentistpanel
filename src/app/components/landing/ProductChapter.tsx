import React from "react";
import Image, { type StaticImageData } from "next/image";

// ── ProductChapterText ───────────────────────────────────────────────────────

interface ProductChapterProps {
  eyebrow: string;
  heading: string;
  text: string;
  headingId?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Reusable product chapter text block.
 * Use inside a 2-col grid — children slot holds the visual composition.
 */
export function ProductChapterText({
  eyebrow,
  heading,
  text,
  headingId,
  className = "",
  children,
}: ProductChapterProps) {
  return (
    <div className={`flex flex-col justify-center ${className}`}>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 mb-6 w-fit">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.18em]">{eyebrow}</span>
      </div>
      <h2
        id={headingId}
        className="text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 mb-5 leading-[1.05]"
      >
        {heading}
      </h2>
      <p className="text-slate-500 font-medium leading-relaxed text-[15px] mb-8 max-w-md">{text}</p>
      {children}
    </div>
  );
}

// ── ScreenshotFrame ──────────────────────────────────────────────────────────

interface ScreenshotFrameProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Browser-chrome screenshot frame for mock UI compositions.
 */
export function ScreenshotFrame({ className = "", children }: ScreenshotFrameProps) {
  return (
    <div
      className={`bg-white rounded-[1.75rem] border border-slate-200/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] overflow-hidden ${className}`}
    >
      {/* Browser-like top bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" aria-hidden="true" />
        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" aria-hidden="true" />
        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" aria-hidden="true" />
        <div className="flex-1 mx-4 h-5 bg-slate-100 rounded-md" aria-hidden="true" />
      </div>
      <div className="p-0">{children}</div>
    </div>
  );
}

// ── LayeredScreenshotStack ───────────────────────────────────────────────────

interface LayeredScreenshotStackProps {
  primarySrc: StaticImageData | string;
  primaryAlt: string;
  secondarySrc: StaticImageData | string;
  secondaryAlt: string;
  /** Extra content overlaid on the stack (e.g. floating info card) */
  overlay?: React.ReactNode;
  className?: string;
}

/**
 * Two screenshots layered with depth — primary foreground, secondary offset behind.
 * Drop-in for 2-col section visuals. Gracefully collapses to a single image on mobile.
 */
export function LayeredScreenshotStack({
  primarySrc,
  primaryAlt,
  secondarySrc,
  secondaryAlt,
  overlay,
  className = "",
}: LayeredScreenshotStackProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Secondary — behind, shifted to top-right */}
      <div
        className="absolute top-4 right-0 w-[80%] rounded-[1.75rem] overflow-hidden
                   shadow-[0_8px_32px_-8px_rgba(0,0,0,0.10)] border border-slate-200/60 z-0"
      >
        <Image
          src={secondarySrc}
          alt={secondaryAlt}
          className="w-full h-auto object-cover"
        />
      </div>
      {/* Primary — foreground, left-anchored */}
      <div
        className="relative w-[85%] rounded-[1.75rem] overflow-hidden
                   shadow-[0_20px_60px_-12px_rgba(0,0,0,0.18)] border border-slate-200/60 z-10 mt-8"
      >
        <Image
          src={primarySrc}
          alt={primaryAlt}
          className="w-full h-auto object-cover"
        />
      </div>
      {/* Optional overlay (floating card etc.) */}
      {overlay && <div className="absolute inset-0 z-20 pointer-events-none">{overlay}</div>}
    </div>
  );
}

// ── FullWidthScreenshotShowcase ──────────────────────────────────────────────

interface FullWidthScreenshotShowcaseProps {
  className?: string;
  children: React.ReactNode;
  /** Optional floating overlay content */
  overlay?: React.ReactNode;
}

/**
 * Premium full-width screenshot container with strong shadow and rounded corners.
 * Use for WhatsApp / wide feature screenshots.
 */
export function FullWidthScreenshotShowcase({
  className = "",
  children,
  overlay,
}: FullWidthScreenshotShowcaseProps) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="rounded-[2rem] overflow-hidden
                   shadow-[0_24px_80px_-20px_rgba(0,0,0,0.14)]
                   border border-slate-200/50"
      >
        {children}
      </div>
      {overlay && (
        <div className="absolute inset-0 pointer-events-none z-10">{overlay}</div>
      )}
    </div>
  );
}

// ── ScreenshotMobileDesktopPair ──────────────────────────────────────────────

interface ScreenshotMobileDesktopPairProps {
  desktopSrc: StaticImageData | string;
  desktopAlt: string;
  mobileSrc: StaticImageData | string;
  mobileAlt: string;
  className?: string;
}

/**
 * Desktop screenshot dominates the full column.
 * Mobile screenshot floats as an absolute card at the bottom-right corner,
 * partially overlapping the desktop — creating depth without obscuring content.
 * Swap images via desktopSrc / mobileSrc props.
 */
export function ScreenshotMobileDesktopPair({
  desktopSrc,
  desktopAlt,
  mobileSrc,
  mobileAlt,
  className = "",
}: ScreenshotMobileDesktopPairProps) {
  return (
    <div className={`relative pb-10 pr-6 ${className}`}>
      {/* Desktop — full column, primary */}
      <div className="rounded-[1.75rem] overflow-hidden shadow-[0_16px_56px_-16px_rgba(0,0,0,0.16)] border border-slate-200/60">
        <Image src={desktopSrc} alt={desktopAlt} className="w-full h-auto object-cover" />
      </div>
      {/* Mobile — floating card, bottom-right */}
      <div className="absolute bottom-0 right-0 w-[34%] rounded-[1.25rem] overflow-hidden shadow-[0_16px_48px_-10px_rgba(0,0,0,0.22)] border border-slate-200/60 ring-2 ring-white">
        <Image src={mobileSrc} alt={mobileAlt} className="w-full h-auto object-cover" />
      </div>
    </div>
  );
}
