"use client";

import { createContext, useContext } from "react";
import type { UserRole, WorkingHours, ClinicSettings } from "@/types/database";
import { DEFAULT_WORKING_HOURS } from "@/constants/days";

export interface ClinicContextValue {
  clinicId: string | null;
  clinicName: string | null;
  clinicSlug: string | null;
  userRole: UserRole | null;
  isSuperAdmin: boolean;
  isAdmin: boolean; // ADMIN veya SUPER_ADMIN
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  workingHours: WorkingHours;
  workingHoursOverrides: { date: string; open: string; close: string; is_closed: boolean; note?: string }[];
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | null;
  billingCycle: 'monthly' | 'annual' | 'pilot' | null;
  currentPeriodEnd: string | null;
  lastPaymentDate: string | null;
  n8nWorkflows: Array<{ id: string; name: string; visible?: boolean; enabled: boolean; time?: string; day?: string }>;
  clinicSettings: ClinicSettings | null;
  planId?: string;
}

const defaultValue: ClinicContextValue = {
  clinicId: null,
  clinicName: null,
  clinicSlug: null,
  userRole: null,
  isSuperAdmin: false,
  isAdmin: false,
  userId: null,
  userName: null,
  userEmail: null,
  workingHours: DEFAULT_WORKING_HOURS,
  workingHoursOverrides: [],
  subscriptionStatus: null,
  billingCycle: null,
  currentPeriodEnd: null,
  lastPaymentDate: null,
  n8nWorkflows: [],
  clinicSettings: null,
};

export const ClinicContext = createContext<ClinicContextValue>(defaultValue);

export function useClinic() {
  return useContext(ClinicContext);
}
