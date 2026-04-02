"use client";

import { createContext, useContext } from "react";
import type { UserRole, WorkingHours, ClinicSettings, ClinicAddon } from "@/types/database";
import { DEFAULT_WORKING_HOURS } from "@/constants/days";

// ─── Identity Context (never changes after login) ──────────────────────────────
// Splitting from data prevents workingHours/settings updates from re-rendering
// nav bars, auth guards, and other identity-only consumers.

export interface ClinicIdentityContextValue {
  clinicId: string | null;
  clinicName: string | null;
  clinicSlug: string | null;
  userRole: UserRole | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  is_clinical_provider?: boolean;
  planId?: string;
  themeColorFrom?: string;
  themeColorTo?: string;
}

// ─── Data Context (changes infrequently: settings, working hours, addons) ───────
  
  export interface ClinicDataContextValue {
    workingHours: WorkingHours;
    workingHoursOverrides: { date: string; open: string; close: string; is_closed: boolean; note?: string }[];
    subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'restricted' | 'canceled' | null;
    billingCycle: 'monthly' | 'annual' | 'pilot' | null;
    currentPeriodEnd: string | null;
    lastPaymentDate: string | null;
    n8nWorkflows: Array<{ id: string; name: string; visible?: boolean; enabled: boolean; time?: string; day?: string }>;
    clinicSettings: ClinicSettings | null;
    clinicAddons: ClinicAddon[];
  }
  
  // ─── UI Context (manages global UI state: overlays, blurs) ─────────────────────
  
  export interface UIContextValue {
    isOverlayActive: boolean;
    isFullOverlay: boolean;
    setOverlayActive: (active: boolean, full?: boolean) => void;
  }
  
  // ─── Full merged type (for backwards-compatible useClinic()) ──────────────────
  
  export interface ClinicContextValue extends ClinicIdentityContextValue, ClinicDataContextValue {}
  
  // ─── Defaults ─────────────────────────────────────────────────────────────────
  
  const defaultIdentity: ClinicIdentityContextValue = {
    clinicId: null,
    clinicName: null,
    clinicSlug: null,
    userRole: null,
    isSuperAdmin: false,
    isAdmin: false,
    userId: null,
    userName: null,
    userEmail: null,
    themeColorFrom: "#0d9488", // teal-600
    themeColorTo: "#10b981",   // emerald-500
  };
  
  const defaultData: ClinicDataContextValue = {
    workingHours: DEFAULT_WORKING_HOURS,
    workingHoursOverrides: [],
    subscriptionStatus: null,
    billingCycle: null,
    currentPeriodEnd: null,
    lastPaymentDate: null,
    n8nWorkflows: [],
    clinicSettings: null,
    clinicAddons: [],
  };
  
  const defaultUI: UIContextValue = {
    isOverlayActive: false,
    isFullOverlay: false,
    setOverlayActive: () => {},
  };
  
  // ─── Contexts ─────────────────────────────────────────────────────────────────
  
  export const ClinicIdentityContext = createContext<ClinicIdentityContextValue>(defaultIdentity);
  export const ClinicDataContext = createContext<ClinicDataContextValue>(defaultData);
  export const UIContext = createContext<UIContextValue>(defaultUI);
  
  // Legacy single context — kept so existing AuthGuard Provider still compiles
  export const ClinicContext = ClinicIdentityContext;
  
  // ─── Hooks ────────────────────────────────────────────────────────────────────
  
  /** Backwards-compatible: returns merged identity + data. Fine for most consumers. */
  export function useClinic(): ClinicContextValue {
    return {
      ...useContext(ClinicIdentityContext),
      ...useContext(ClinicDataContext),
    };
  }
  
  /** Granular hook: only re-renders when identity fields change (clinicId, role, etc.) */
  export function useClinicIdentity(): ClinicIdentityContextValue {
    return useContext(ClinicIdentityContext);
  }
  
  /** Granular hook: only re-renders when data fields change (workingHours, settings, etc.) */
  export function useClinicData(): ClinicDataContextValue {
    return useContext(ClinicDataContext);
  }
  
  /** UI hook: for managing global overlay and focus state */
  export function useUI(): UIContextValue {
    return useContext(UIContext);
  }
